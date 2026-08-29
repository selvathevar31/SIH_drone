from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.response import SimulationRequest, SimulationResult
from app.services.response_simulator import simulate_response
from app.models.simulation import ResponseSimulation
from app.models.mission import Mission
from app.models.reading import Reading

router = APIRouter(prefix="/api/missions", tags=["Response Simulation"])

@router.post("/{mission_id}/response/simulate", response_model=SimulationResult)
def create_simulation(mission_id: str, request: SimulationRequest, db: Session = Depends(get_db)):
    mission = db.query(Mission).filter(Mission.mission_id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
        
    return simulate_response(mission_id, request, db)

@router.get("/{mission_id}/response/latest", response_model=SimulationResult)
def get_latest_simulation(mission_id: str, db: Session = Depends(get_db)):
    sim = db.query(ResponseSimulation).filter(ResponseSimulation.mission_id == mission_id).order_by(ResponseSimulation.created_at.desc()).first()
    if not sim:
        raise HTTPException(status_code=404, detail="No simulations found for this mission")
        
    simulated_readings = db.query(Reading).filter(Reading.mission_id == sim.simulation_id).all()
    readings_list = [{"latitude": r.latitude, "longitude": r.longitude, "altitude": r.altitude, "aqi": r.aqi, "pm25": r.pm25} for r in simulated_readings]

    return SimulationResult(
        simulation_id=sim.simulation_id,
        mission_id=sim.mission_id,
        status=sim.status,
        risk=sim.risk_level,
        response_plan=sim.response_plan,
        simulated_readings=readings_list,
        before=sim.before_metrics,
        after=sim.after_metrics,
        effectiveness=sim.effectiveness,
        evidence=sim.evidence
    )

@router.get("/{mission_id}/response/{simulation_id}", response_model=SimulationResult)
def get_simulation(mission_id: str, simulation_id: str, db: Session = Depends(get_db)):
    sim = db.query(ResponseSimulation).filter(
        ResponseSimulation.mission_id == mission_id,
        ResponseSimulation.simulation_id == simulation_id
    ).first()
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")
        
    simulated_readings = db.query(Reading).filter(Reading.mission_id == sim.simulation_id).all()
    readings_list = [{"latitude": r.latitude, "longitude": r.longitude, "altitude": r.altitude, "aqi": r.aqi, "pm25": r.pm25} for r in simulated_readings]

    return SimulationResult(
        simulation_id=sim.simulation_id,
        mission_id=sim.mission_id,
        status=sim.status,
        risk=sim.risk_level,
        response_plan=sim.response_plan,
        simulated_readings=readings_list,
        before=sim.before_metrics,
        after=sim.after_metrics,
        effectiveness=sim.effectiveness,
        evidence=sim.evidence
    )
