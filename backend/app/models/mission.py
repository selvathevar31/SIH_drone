from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Mission(Base):
    __tablename__ = "missions"

    id = Column(Integer, primary_key=True, index=True)
    mission_id = Column(String, unique=True, index=True, nullable=False)
    drone_id = Column(String, index=True)
    status = Column(String, default="PLANNED")  # PLANNED, IN_FLIGHT, COMPLETED, ABORTED
    data_source = Column(String, default="UNKNOWN")  # CSV, ESP32, DEMO
    
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    duration_seconds = Column(Integer, default=0)
    distance_km = Column(Float, default=0.0)
    total_readings = Column(Integer, default=0)
    
    start_latitude = Column(Float, nullable=True)
    start_longitude = Column(Float, nullable=True)
    current_latitude = Column(Float, nullable=True)
    current_longitude = Column(Float, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    readings = relationship("Reading", back_populates="mission", cascade="all, delete-orphan")
    hotspots = relationship("Hotspot", back_populates="mission", cascade="all, delete-orphan")
