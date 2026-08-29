from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from datetime import datetime
from app.core.database import Base

class ResponseSimulation(Base):
    __tablename__ = "response_simulations"

    id = Column(Integer, primary_key=True, index=True)
    simulation_id = Column(String, unique=True, index=True, nullable=False)
    mission_id = Column(String, ForeignKey("missions.mission_id"), index=True)
    
    status = Column(String, default="SIMULATION_ONLY")
    risk_level = Column(String)
    
    response_plan = Column(JSON, default=list) 
    before_metrics = Column(JSON, default=dict)
    after_metrics = Column(JSON, default=dict)
    effectiveness = Column(JSON, default=dict)
    evidence = Column(JSON, default=list)
    
    created_at = Column(DateTime, default=datetime.utcnow)
