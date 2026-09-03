from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.mission_replay import get_replay_events, generate_replay_summary
from app.models.mission import Mission
from datetime import datetime

router = APIRouter(prefix="/api/missions", tags=["Mission Replay"])

@router.get("/{mission_id}/replay")
def get_mission_replay(
    mission_id: str, 
    start_time: str = None, 
    end_time: str = None, 
    db: Session = Depends(get_db)
):
    mission = db.query(Mission).filter(Mission.mission_id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
        
    events = get_replay_events(mission_id, db, start_time, end_time)
    
    # Calculate duration
    duration = 0
    if events:
        first = datetime.fromisoformat(events[0]["timestamp"].replace('Z', '+00:00'))
        last = datetime.fromisoformat(events[-1]["timestamp"].replace('Z', '+00:00'))
        duration = (last - first).total_seconds()
        
    summary = generate_replay_summary(mission_id, events, db)
    
    return {
        "mission_id": mission_id,
        "duration_seconds": int(duration),
        "total_events": len(events),
        "events": events,
        "summary": summary
    }
