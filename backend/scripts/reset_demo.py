#!/usr/bin/env python3
"""
Utility script to safely reset simulated demo data from the FLUXX database.
Cleans up missions where data_source == "DEMO" or mission_id starts with "SIM-".
Uses SQLAlchemy cascade configuration to wipe associated readings and hotspots.
"""

import os
import sys

# Setup backend app import path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.mission import Mission

def reset_demo_data():
    print("[FLUXX] Resetting simulated demo data...")
    
    db: Session = SessionLocal()
    try:
        # Query simulated missions
        demo_missions = db.query(Mission).filter(
            (Mission.data_source == "DEMO") | 
            (Mission.mission_id.like("SIM-%"))
        ).all()
        
        if not demo_missions:
            print("[FLUXX] No simulated demo missions found. Database is already clean.")
            return
            
        print(f"[FLUXX] Found {len(demo_missions)} simulated missions to delete:")
        for m in demo_missions:
            print(f" - {m.mission_id} ({m.total_readings} readings, status: {m.status})")
            
        # Prompt for confirmation
        confirm = input("\nAre you sure you want to delete these missions and all their readings/hotspots? (y/N): ")
        if confirm.lower() != 'y':
            print("[FLUXX] Reset cancelled.")
            return
            
        # Delete missions (cascade configuration will delete readings and hotspots automatically)
        for m in demo_missions:
            db.delete(m)
            
        db.commit()
        print("[FLUXX] Database reset successful! Demo data cleaned up.")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Database reset failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    reset_demo_data()
