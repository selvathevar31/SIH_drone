from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Reading(Base):
    __tablename__ = "readings"

    id = Column(Integer, primary_key=True, index=True)
    mission_id = Column(String, ForeignKey("missions.mission_id"), index=True)
    data_source = Column(String, default="UNKNOWN") # CSV, ESP32, DEMO
    
    timestamp = Column(DateTime, index=True, nullable=False)
    
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    altitude = Column(Float, nullable=True)
    altitude_reference = Column(String, default="RELATIVE_HOME")
    pm1 = Column(Float, nullable=True)
    pm25 = Column(Float, nullable=True)
    pm10 = Column(Float, nullable=True)
    
    temperature = Column(Float, nullable=True)
    humidity = Column(Float, nullable=True)
    
    speed = Column(Float, nullable=True)
    heading = Column(Float, nullable=True)
    battery = Column(Integer, nullable=True)
    satellites = Column(Integer, nullable=True)
    gps_status = Column(String, nullable=True)
    signal_strength = Column(Float, nullable=True)
    
    aqi = Column(Integer, nullable=True)
    aqi_category = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    mission = relationship("Mission", back_populates="readings")
