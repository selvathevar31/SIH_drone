import joblib
import sys
import numpy as np
import json
import os

def analyze_model(model_path):
    print(f"Loading model from: {model_path}")
    if not os.path.exists(model_path):
        print("Model file not found!")
        return
        
    model = joblib.load(model_path)
    
    print("\n--- 1. Dataset & Metadata Clues ---")
    # Check for any custom attributes the data scientist might have left
    for attr in dir(model):
        if not attr.startswith('_') and attr not in ['fit', 'predict', 'score', 'set_params', 'get_params']:
            try:
                val = getattr(model, attr)
                if isinstance(val, (str, int, float, dict)) and len(str(val)) < 100:
                    print(f"  {attr}: {val}")
            except:
                pass

    print("\n--- 2 & 4 & 8. Tree Inspection (Splits, Ranges, and Importance) ---")
    if hasattr(model, "_predictors"):
        predictors = model._predictors
        print(f"  Total trees: {len(predictors)}")
        
        feature_names = list(model.feature_names_in_)
        
        # Track which features are used, their split values (to infer ranges), and root usage
        feature_usage_count = {f: 0 for f in feature_names}
        feature_split_min = {f: float('inf') for f in feature_names}
        feature_split_max = {f: float('-inf') for f in feature_names}
        root_features = {f: 0 for f in feature_names}
        
        for i, trees_for_iteration in enumerate(predictors):
            # predictors is shape (n_iter, n_trees_per_iteration). For regressor, n_trees_per_iteration is 1.
            for tree in trees_for_iteration:
                nodes = tree.nodes
                
                # Check root node
                if len(nodes) > 0 and not nodes[0]['is_leaf']:
                    root_feat_idx = nodes[0]['feature_idx']
                    root_features[feature_names[root_feat_idx]] += 1
                
                for node in nodes:
                    if not node['is_leaf']:
                        feat_idx = node['feature_idx']
                        val = node['value']
                        feat_name = feature_names[feat_idx]
                        
                        feature_usage_count[feat_name] += 1
                        if val < feature_split_min[feat_name]:
                            feature_split_min[feat_name] = val
                        if val > feature_split_max[feat_name]:
                            feature_split_max[feat_name] = val
                            
        print("\n  Top 15 Features by Number of Splits (Proxy for Importance):")
        sorted_usage = sorted(feature_usage_count.items(), key=lambda x: x[1], reverse=True)
        for f, count in sorted_usage[:15]:
            print(f"    {f}: {count} splits")
            
        print("\n  Top 10 Features Used as Root Node (High Importance Proxy):")
        sorted_roots = sorted(root_features.items(), key=lambda x: x[1], reverse=True)
        for f, count in sorted_roots[:10]:
            if count > 0:
                print(f"    {f}: {count} times as root")
                
        print("\n  Inferred Ranges for the 17 Base Variables (Based on Split Thresholds):")
        base_vars = feature_names[:17]
        for f in base_vars:
            if feature_usage_count[f] > 0:
                print(f"    {f}: Used {feature_usage_count[f]} times, splits range [{feature_split_min[f]:.2f}, {feature_split_max[f]:.2f}]")
            else:
                print(f"    {f}: NOT USED in any splits")
                
        print("\n  Missing-Value Indicators Usage:")
        missing_vars = [f for f in feature_names if '_missing' in f]
        missing_used = 0
        for f in missing_vars:
            count = feature_usage_count[f]
            if count > 0:
                missing_used += count
        print(f"    Total splits using '_missing' indicators: {missing_used}")
        if missing_used > 0:
            print("    Top 5 most used missing indicators:")
            sorted_missing = sorted([(f, feature_usage_count[f]) for f in missing_vars], key=lambda x: x[1], reverse=True)
            for f, count in sorted_missing[:5]:
                if count > 0:
                    print(f"      {f}: {count} splits")
    else:
        print("  Not a recognized tree ensemble or missing _predictors attribute.")

if __name__ == "__main__":
    analyze_model("c:\\projects\\drone\\ml_inference\\fluxx_aqi_6h_weighted_hgb.joblib")
