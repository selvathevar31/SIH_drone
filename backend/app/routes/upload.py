from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.mission import Mission
from app.models.reading import Reading
from app.services.csv_importer import process_csv_upload
from app.services.aqi import calculate_aqi
import os
import uuid

router = APIRouter(prefix="/api/upload", tags=["Upload"])

@router.post("/csv", status_code=status.HTTP_201_CREATED)
async def upload_csv(
    file: UploadFile = File(...), 
    mission_id: str = Form(None),
    drone_id: str = Form("UNKNOWN"),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
        
    content = await file.read()
    
    # Check size (e.g., limit 10MB)
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max size is 10MB")
        
    actual_mission_id = mission_id or f"QDR-{uuid.uuid4().hex[:8].upper()}"
    
    result = process_csv_upload(content, actual_mission_id, data_source="CSV")
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
        
    readings = result["readings"]
    if not readings:
        raise HTTPException(status_code=400, detail="No valid readings found in CSV")
        
    # Create or update mission
    mission = db.query(Mission).filter(Mission.mission_id == actual_mission_id).first()
    if not mission:
        mission = Mission(
            mission_id=actual_mission_id, 
            drone_id=drone_id,
            status="COMPLETED",
            data_source="CSV",
            start_time=readings[0].timestamp,
            end_time=readings[-1].timestamp,
            start_latitude=readings[0].latitude,
            start_longitude=readings[0].longitude,
            current_latitude=readings[-1].latitude,
            current_longitude=readings[-1].longitude,
            total_readings=len(readings)
        )
        db.add(mission)
    else:
        mission.total_readings += len(readings)
        
    # Bulk insert readings with AQI calculated
    db_readings = []
    for r in readings:
        aqi_data = calculate_aqi(pm25=r.pm25, pm10=r.pm10)
        db_readings.append(
            Reading(
                mission_id=r.mission_id,
                data_source=r.data_source,
                timestamp=r.timestamp,
                latitude=r.latitude,
                longitude=r.longitude,
                altitude=r.altitude,
                pm25=r.pm25,
                pm10=r.pm10,
                temperature=r.temperature,
                humidity=r.humidity,
                speed=r.speed,
                heading=r.heading,
                battery=r.battery,
                satellites=r.satellites,
                gps_status=r.gps_status,
                signal_strength=r.signal_strength,
                aqi=aqi_data["aqi"],
                aqi_category=aqi_data["category"]
            )
        )
        
    db.bulk_save_objects(db_readings)
    db.commit()
    
    # Auto-trigger hotspot detection
    from app.routes.hotspots import detect_hotspots
    hotspots = detect_hotspots(actual_mission_id, db)
    
    return {
        "success": True,
        "mission_id": actual_mission_id,
        "rows_processed": result["rows_processed"],
        "rows_rejected": result["rows_rejected"],
        "hotspots_detected": len(hotspots)
    }

@router.post("/demo-csv", status_code=status.HTTP_201_CREATED)
async def load_demo_csv(db: Session = Depends(get_db)):
    # Path to the generated demo CSV
    demo_file_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data', 'demo', 'qudracopter_demo_mission.csv')
    
    if not os.path.exists(demo_file_path):
        raise HTTPException(status_code=404, detail="Demo CSV not found. Run generate_demo_csv.py first.")
        
    with open(demo_file_path, 'rb') as f:
        content = f.read()
        
    mission_id = f"QDR-DEMO-CSV-{uuid.uuid4().hex[:4].upper()}"
    
    result = process_csv_upload(content, mission_id, data_source="CSV")
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
        
    readings = result["readings"]
    if not readings:
        raise HTTPException(status_code=400, detail="No valid readings found in demo CSV")
        
    # Create mission
    mission = Mission(
        mission_id=mission_id, 
        drone_id="QDRONE-01",
        status="COMPLETED",
        data_source="CSV",
        start_time=readings[0].timestamp,
        end_time=readings[-1].timestamp,
        start_latitude=readings[0].latitude,
        start_longitude=readings[0].longitude,
        current_latitude=readings[-1].latitude,
        current_longitude=readings[-1].longitude,
        total_readings=len(readings)
    )
    db.add(mission)
        
    # Bulk insert readings with AQI calculated
    db_readings = []
    for r in readings:
        aqi_data = calculate_aqi(pm25=r.pm25, pm10=r.pm10)
        db_readings.append(
            Reading(
                mission_id=r.mission_id,
                data_source=r.data_source,
                timestamp=r.timestamp,
                latitude=r.latitude,
                longitude=r.longitude,
                altitude=r.altitude,
                pm25=r.pm25,
                pm10=r.pm10,
                temperature=r.temperature,
                humidity=r.humidity,
                speed=r.speed,
                heading=r.heading,
                battery=r.battery,
                satellites=r.satellites,
                gps_status=r.gps_status,
                signal_strength=r.signal_strength,
                aqi=aqi_data["aqi"],
                aqi_category=aqi_data["category"]
            )
        )
        
    db.bulk_save_objects(db_readings)
    db.commit()
    
    # Auto-trigger hotspot detection
    from app.routes.hotspots import detect_hotspots
    hotspots = detect_hotspots(mission_id, db)
    
    return {
        "success": True,
        "mission_id": mission_id,
        "rows_processed": result["rows_processed"],
        "rows_rejected": result["rows_rejected"],
        "hotspots_detected": len(hotspots)
    }
