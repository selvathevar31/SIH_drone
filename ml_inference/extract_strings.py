import re
import os

def extract_features(filepath):
    try:
        with open(filepath, 'rb') as f:
            data = f.read()
        
        # In a joblib/pickle file from sklearn, feature names are often saved as strings
        # looking like: \x0bAQI_change_1h
        # Let's extract all printable strings longer than 3 chars
        strings = re.findall(rb'[A-Za-z0-9_().% \-]{4,}', data)
        strings = [s.decode('utf-8', errors='ignore') for s in strings]
        
        # Filter strings that look like our features
        feature_candidates = []
        for s in strings:
            if "PM2.5" in s or "AQI" in s or "AT (degC)" in s or "hour" in s or "day_" in s or "month" in s or "lag" in s:
                if len(s) < 50 and s not in feature_candidates:
                    feature_candidates.append(s)
                    
        print(f"Extracted {len(feature_candidates)} potential feature names.")
        for f in feature_candidates[:20]:
            print(" -", f)
            
        if "AQI_change_1h" in strings:
            print("FOUND AQI_change_1h!")
        else:
            print("DID NOT FIND AQI_change_1h")
            
        print("Total strings:", len(strings))
        
    except Exception as e:
        print("Error:", str(e))

model_path = os.path.join(os.path.dirname(__file__), 'fluxx_aqi_6h_weighted_hgb.joblib')
if os.path.exists(model_path):
    extract_features(model_path)
