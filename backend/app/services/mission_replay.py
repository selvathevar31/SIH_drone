from typing import List, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime
from app.models.mission import Mission
from app.services.event_system import generate_events
from app.models.simulation import ResponseSimulation

def get_replay_events(mission_id: str, db: Session, start_time: str = None, end_time: str = None) -> List[Dict[str, Any]]:
    """
    Reconstruct the chronological timeline of the mission.
    """
    mission = db.query(Mission).filter(Mission.mission_id == mission_id).first()
    if not mission:
        return []
        
    # Get base events
    events = generate_events(mission_id, db)
    
    # Check for simulations to append to timeline
    simulations = db.query(ResponseSimulation).filter(ResponseSimulation.mission_id == mission_id).all()
    for idx, sim in enumerate(simulations):
        # We append simulation events near the end of the mission, or at their actual creation time
        sim_time = sim.created_at.isoformat() if sim.created_at else datetime.utcnow().isoformat()
        
        events.append({
            "event_id": f"event-{mission_id}-sim-start-{idx}",
            "timestamp": sim_time,
            "type": "SIMULATION_STARTED",
            "severity": "INFO",
            "title": "Simulation Engine Started",
            "message": f"Closed-loop response simulation initialized. Modeling deterministic interventions.",
            "source": "SIMULATION",
            "simulation_id": sim.simulation_id
        })
        
        events.append({
            "event_id": f"event-{mission_id}-sim-complete-{idx}",
            "timestamp": sim_time, # in reality might be a few seconds later, we use the same for simplicity
            "type": "SIMULATION_COMPLETED",
            "severity": "INFO" if sim.effectiveness.get("classification") != "INEFFECTIVE" else "WARNING",
            "title": "Simulation Analysis Complete",
            "message": f"Result: {sim.effectiveness.get('classification', 'UNKNOWN')}. Improvement score: {sim.effectiveness.get('improvement_score', 0):.1f}/100",
            "source": "SIMULATION",
            "simulation_id": sim.simulation_id
        })

    # Sort chronologically (oldest first for replay)
    sorted_events = sorted(events, key=lambda x: x["timestamp"])
    
    # Filter by time if requested
    if start_time or end_time:
        filtered_events = []
        start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00')) if start_time else None
        end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00')) if end_time else None
        
        for ev in sorted_events:
            ev_dt = datetime.fromisoformat(ev["timestamp"].replace('Z', '+00:00'))
            if start_dt and ev_dt < start_dt:
                continue
            if end_dt and ev_dt > end_dt:
                continue
            filtered_events.append(ev)
        return filtered_events

    return sorted_events

def generate_replay_summary(mission_id: str, events: List[Dict[str, Any]], db: Session) -> Dict[str, Any]:
    """Generate high level statistics about the replay timeline."""
    return {
        "mission_id": mission_id,
        "total_events": len(events),
        "hotspots_detected": sum(1 for e in events if e["type"] == "HOTSPOT_DETECTED"),
        "simulations_run": sum(1 for e in events if e["type"] == "SIMULATION_COMPLETED"),
        "start_time": events[0]["timestamp"] if events else None,
        "end_time": events[-1]["timestamp"] if events else None
    }
