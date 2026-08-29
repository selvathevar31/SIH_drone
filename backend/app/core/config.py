import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "QUDRACOPTER Backend"
    
    # Use standard sqlite file by default if not set in environment
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./data/qudracopter.db")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    
    HOTSPOT_MIN_AQI: float = float(os.getenv("HOTSPOT_MIN_AQI", 100))
    HOTSPOT_MIN_SAMPLES: int = int(os.getenv("HOTSPOT_MIN_SAMPLES", 5))
    HOTSPOT_RADIUS_METERS: float = float(os.getenv("HOTSPOT_RADIUS_METERS", 75))

    COMPARISON_RADIUS_METERS: float = float(os.getenv("COMPARISON_RADIUS_METERS", 50))
    CHANGE_SIGNIFICANT_PERCENT: float = float(os.getenv("CHANGE_SIGNIFICANT_PERCENT", 20.0))
    CHANGE_STABLE_PERCENT: float = float(os.getenv("CHANGE_STABLE_PERCENT", 5.0))
    
    PM25_THRESHOLD: float = float(os.getenv("PM25_THRESHOLD", 60.0))
    PM25_HIGH_THRESHOLD: float = float(os.getenv("PM25_HIGH_THRESHOLD", 90.0))
    PM10_THRESHOLD: float = float(os.getenv("PM10_THRESHOLD", 100.0))
    PM10_HIGH_THRESHOLD: float = float(os.getenv("PM10_HIGH_THRESHOLD", 150.0))

    ZONE_RADIUS_METERS: float = float(os.getenv("ZONE_RADIUS_METERS", 100.0))
    ZONE_MIN_SAMPLES: int = int(os.getenv("ZONE_MIN_SAMPLES", 5))
    PERSISTENT_HOTSPOT_RADIUS_METERS: float = float(os.getenv("PERSISTENT_HOTSPOT_RADIUS_METERS", 100.0))
    PERSISTENT_HOTSPOT_MIN_SURVEYS: int = int(os.getenv("PERSISTENT_HOTSPOT_MIN_SURVEYS", 2))

    class Config:
        env_file = ".env"

settings = Settings()
