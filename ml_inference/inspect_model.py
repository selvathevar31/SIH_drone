import os
import pandas as pd
import pandas as pd
import numpy as np
from datetime import timedelta
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Configuration
MONGO_URI = os.environ.get("MONGODB_URI", "mongodb://127.0.0.1:27017/qudracopterDB")
MODEL_OUTPUT_PATH = "fluxx_aqi_drone_hgb.joblib"
MIN_DATA_ROWS_REQUIRED = 10000

# Provisional 7-Feature Set
FEATURES = ['pm25', 'pm10', 'temperature', 'humidity', 'altitude', 'hour_sin', 'hour_cos']
TARGET = 'aqi_6h'

def validate_and_extract(df):
    """Validate records and reject malformed ones without fabricating values."""
    if df.empty:
        return df
        
    required_cols = ['timestamp', 'latitude', 'longitude', 'altitude', 'pm25', 'pm10', 'temperature', 'humidity']
    for col in required_cols:
        if col not in df.columns:
            logging.error(f"Missing critical column in DB output: {col}")
            return pd.DataFrame()

    # Drop any row with missing base telemetry (no fabrication/interpolation)
    df_clean = df.dropna(subset=required_cols).copy()
    
    # Ensure types
    df_clean['timestamp'] = pd.to_datetime(df_clean['timestamp'])
    for col in ['latitude', 'longitude', 'altitude', 'pm25', 'pm10', 'temperature', 'humidity']:
        df_clean[col] = pd.to_numeric(df_clean[col], errors='coerce')
        
    df_clean = df_clean.dropna(subset=required_cols)
    
    # Sort chronologically
    df_clean = df_clean.sort_values(by='timestamp').reset_index(drop=True)
    return df_clean

def construct_target(df):
    """
    Construct AQI_6h ONLY when a valid observation approximately 6 hours in the future exists.
    Does not interpolate or create fake labels.
    """
    if df.empty:
        return df

    if 'aqi' not in df.columns:
        df['aqi'] = df['pm25'] # Placeholder AQI calculation for pipeline structure

    df_target = df[['timestamp', 'latitude', 'longitude', 'aqi']].copy()
    df_target['target_timestamp'] = df_target['timestamp']
    df_target['timestamp'] = df_target['timestamp'] - timedelta(hours=6)
    df_target = df_target.rename(columns={'aqi': 'aqi_6h'})

    df = df.sort_values('timestamp')
    df_target = df_target.sort_values('timestamp')

    merged = pd.merge_asof(
        df, 
        df_target[['timestamp', 'aqi_6h']], 
        on='timestamp', 
        direction='forward',
        tolerance=pd.Timedelta('30m')
    )
    
    df_final = merged.dropna(subset=['aqi_6h']).copy()
    return df_final

def engineer_features(df):
    """Implement the 7-feature transformation."""
    if df.empty:
        return df

    df['hour'] = df['timestamp'].dt.hour
    df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24.0)
    df['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24.0)
    
    return df

def run_pipeline():
    logging.info("Starting Pipeline Preparation...")
    logging.info("Step 1: Connecting to MongoDB...")
    
    try:
        import pymongo
        client = pymongo.MongoClient(MONGO_URI)
        db = client.get_database()
        collection = db['readings']
        cursor = collection.find({})
        df_raw = pd.DataFrame(list(cursor))
        logging.info(f"Retrieved {len(df_raw)} records from DB.")
    except Exception as e:
        logging.error(f"Database error: {e}")
        df_raw = pd.DataFrame()

    logging.info("Step 2: CSV Validation & Cleaning...")
    df_clean = validate_and_extract(df_raw)
    
    logging.info("Step 3: Chronological ordering & Target Construction...")
    df_with_target = construct_target(df_clean)
    
    logging.info("Step 4: 7-Feature Engineering...")
    df_features = engineer_features(df_with_target)

    # Check data sufficiency
    if len(df_features) == 0:
        logging.warning("CRITICAL BLOCKER: Dataset contains zero telemetry records with valid future AQI observations.")
        logging.warning("Pipeline Execution Halted. Training blocked until valid telemetry is available.")
        return
        
    if len(df_features) < MIN_DATA_ROWS_REQUIRED:
        logging.warning(f"CRITICAL BLOCKER: Insufficient data. Found {len(df_features)} rows, require at least {MIN_DATA_ROWS_REQUIRED}.")
        logging.warning("Pipeline Execution Halted. Training blocked until valid telemetry is available.")
        return

    logging.info("Step 5: Train / Validation / Test split...")
    from sklearn.model_selection import train_test_split
    X = df_features[FEATURES]
    y = df_features[TARGET]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    logging.info("Step 6: [TRAINING STEP - PREPARE ONLY, DO NOT EXECUTE]")
    logging.info("Training intentionally bypassed. Model evaluation and saving bypassed.")
    logging.info("Pipeline preparation complete.")

if __name__ == "__main__":
    run_pipeline()
