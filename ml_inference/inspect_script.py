# pyrefly: ignore [missing-import]
import joblib
import sys

try:
    print("Python version:", sys.version)
    model = joblib.load("c:\\projects\\drone\\ml_inference\\fluxx_aqi_6h_weighted_hgb.joblib")

    print(type(model))

    if hasattr(model, "feature_names_in_"):
        print(len(model.feature_names_in_))
        print(list(model.feature_names_in_))

    if hasattr(model, "n_features_in_"):
        print("n_features_in_:", model.n_features_in_)

except Exception as e:
    print("Error:", e)
