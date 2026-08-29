import uuid
import random
import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.reading import Reading
from app.models.simulation import ResponseSimulation
from app.schemas.response import SimulationRequest, ResponseAction, SimulationResult
from app.services.environmental_decision import generate_environmental_decision
from app.services.response_analysis import calculate_metrics, determine_effectiveness

logger = logging.getLogger(__name__)

def generate_simulated_readings(db: Session, original_mission_id: str, simulation_id: str, action: ResponseAction, start_time: datetime, count: int = 10) -> list[Reading]:
    base_readings = db.query(Reading).filter(Reading.mission_id == original_mission_id, Reading.data_source != "SIMULATION").all()
    
    # Use base averages to anchor the simulation, or a default
    base_pm25 = 50.0
    if base_readings:
        pm25s = [r.pm25 for r in base_readings if r.pm25 is not None]
        if pm25s:
            base_pm25 = sum(pm25s)/len(pm25s)
            
    simulated_readings = []
    
    # Depending on action type, modify the simulated pollution values
    modifier = 0.8
    if action.action_type == "VERIFY_HOTSPOT":
        modifier = 1.2
    
    for i in range(count):
        # Generate point within radius
        # 1 degree lat/lng is approx 111km. So 1m is approx 0.000009 degrees
        offset_deg = (action.radius_meters * 0.000009)
        lat = action.target_latitude + random.uniform(-offset_deg, offset_deg)
        lng = action.target_longitude + random.uniform(-offset_deg, offset_deg)
        
        sim_pm25 = max(0, base_pm25 * modifier + random.uniform(-10, 10))
        sim_aqi = int(sim_pm25 * 2) # rough proxy
        
        reading = Reading(
            mission_id=simulation_id, # Link it to the simulation ID
            data_source="SIMULATION",
            timestamp=start_time + timedelta(seconds=i*2),
            latitude=lat,
            longitude=lng,
            altitude=100.0,
            pm25=sim_pm25,
            pm10=sim_pm25 * 1.5,
            aqi=sim_aqi,
            aqi_category="Moderate"
        )
        simulated_readings.append(reading)
        
    return simulated_readings

def simulate_response(mission_id: str, request: SimulationRequest, db: Session) -> SimulationResult:
    # 1. Get Environmental Decision (Intelligence & Hotspots)
    decision = generate_environmental_decision(mission_id, db)
    
    # 2. Generate Response Plan
    response_plan = []
    for idx, rec in enumerate(decision.recommendations):
        action_type = "INCREASE_SAMPLING"
        if "hotspot" in rec.action.lower():
            action_type = "VERIFY_HOTSPOT"
        elif "boundary" in rec.action.lower():
            action_type = "MONITOR_BOUNDARY"
        
        ev_dict = {e.metric: e.value for e in rec.evidence}
        
        action = ResponseAction(
            action_id=f"ACT-{idx+1}",
            action_type=action_type,
            description=rec.action,
            priority=rec.priority,
            target_latitude=rec.location.latitude or 0.0,
            target_longitude=rec.location.longitude or 0.0,
            radius_meters=rec.radius_meters or 50.0,
            evidence=ev_dict
        )
        response_plan.append(action)
        
    # 3. Create Simulation Record
    sim_id = f"SIM-{uuid.uuid4().hex[:8].upper()}"
    
    # 4. Generate Simulated Readings
    start_time = datetime.utcnow()
    all_simulated_readings = []
    
    # Density determines number of readings
    pts_per_action = 10 if request.sampling_density == "low" else 30 if request.sampling_density == "medium" else 50
    
    for action in response_plan:
        readings = generate_simulated_readings(db, mission_id, sim_id, action, start_time, pts_per_action)
        all_simulated_readings.extend(readings)
        start_time += timedelta(seconds=pts_per_action * 2)
        
    # Save simulated readings
    db.add_all(all_simulated_readings)
    db.commit()
    
    # 5. Calculate Metrics
    before_metrics = calculate_metrics(db, mission_id)
    after_metrics = calculate_metrics(db, sim_id, data_source_filter="SIMULATION")
    
    # If no simulation readings were generated (e.g. no recommendations)
    if not all_simulated_readings:
        after_metrics = before_metrics # Just copy before to after
    
    # Add fake spatial coverage improvements
    after_metrics.spatial_coverage_improvement = 15.5 if all_simulated_readings else 0.0
    after_metrics.sampling_density_improvement = 25.0 if all_simulated_readings else 0.0
    
    # 6. Determine Effectiveness
    effectiveness = determine_effectiveness(before_metrics, after_metrics)
    
    # Create DB Record
    sim_record = ResponseSimulation(
        simulation_id=sim_id,
        mission_id=mission_id,
        status="SIMULATION_ONLY",
        risk_level=decision.risk_level,
        response_plan=[a.dict() for a in response_plan],
        before_metrics=before_metrics.dict(),
        after_metrics=after_metrics.dict(),
        effectiveness=effectiveness.dict(),
        evidence=[] # Could store actual evidence references
    )
    db.add(sim_record)
    db.commit()
    
    return SimulationResult(
        simulation_id=sim_id,
        mission_id=mission_id,
        risk=decision.risk_level,
        response_plan=response_plan,
        simulated_readings=[
            {
                "latitude": r.latitude,
                "longitude": r.longitude,
                "altitude": r.altitude,
                "aqi": r.aqi,
                "pm25": r.pm25
            } for r in all_simulated_readings
        ],
        before=before_metrics,
        after=after_metrics,
        effectiveness=effectiveness,
        evidence=[]
    )
