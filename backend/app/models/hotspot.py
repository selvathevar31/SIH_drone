from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Hotspot(Base):
    __tablename__ = "hotspots"

    id = Column(Integer, primary_key=True, index=True)
    mission_id = Column(String, ForeignKey("missions.mission_id"), index=True)
    
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    
    radius_meters = Column(Float, nullable=False)
    
    average_aqi = Column(Float, nullable=True)
    peak_aqi = Column(Integer, nullable=True)
    
    average_pm25 = Column(Float, nullable=True)
    peak_pm25 = Column(Float, nullable=True)
    
    average_pm10 = Column(Float, nullable=True)
    peak_pm10 = Column(Float, nullable=True)
    
    severity = Column(String, nullable=True)
    reading_count = Column(Integer, default=0)
    
    # Altitude Intelligence
    min_altitude = Column(Float, nullable=True)
    max_altitude = Column(Float, nullable=True)
    average_altitude = Column(Float, nullable=True)
    
    detected_at = Column(DateTime, default=datetime.utcnow)

    mission = relationship("Mission", back_populates="hotspots")
