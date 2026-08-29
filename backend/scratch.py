import sys, os
sys.path.insert(0, os.path.abspath('.'))
from app.core.database import SessionLocal
from app.models.mission import Mission
from app.models.reading import Reading
from app.models.hotspot import Hotspot
from sqlalchemy import func

db = SessionLocal()

missions = db.query(Mission).order_by(Mission.created_at.desc()).limit(10).all()
mission_ids = [m.mission_id for m in missions]

readings_stats = db.query(
    Reading.mission_id,
    func.avg(Reading.aqi).label('avg_aqi'),
    func.max(Reading.aqi).label('max_aqi'),
    func.avg(Reading.pm25).label('avg_pm25'),
    func.max(Reading.pm25).label('max_pm25'),
    func.avg(Reading.pm10).label('avg_pm10'),
    func.max(Reading.pm10).label('max_pm10'),
    func.avg(Reading.temperature).label('avg_temperature'),
    func.avg(Reading.humidity).label('avg_humidity')
).filter(Reading.mission_id.in_(mission_ids)).group_by(Reading.mission_id).all()

hotspots_stats = db.query(
    Hotspot.mission_id,
    func.count(Hotspot.id).label('count')
).filter(Hotspot.mission_id.in_(mission_ids)).group_by(Hotspot.mission_id).all()

print(readings_stats)
print(hotspots_stats)
