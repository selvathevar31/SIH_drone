import requests
import time
import json
import sys

BASE_URL = "http://localhost:8000/api"

def print_result(step, success, msg=""):
    status = "[PASS]" if success else "[FAIL]"
    print(f"{status} {step} {msg}")
    if not success:
        sys.exit(1)

def verify_demo():
    print("Starting End-to-End SIH Demo Verification...\n")
    
    # 1. API Health
    try:
        res = requests.get(f"{BASE_URL}/health")
        health = res.json()
        print_result("API health", res.status_code == 200)
    except:
        print_result("API health", False, "Backend unreachable")
        
    # 2. Initialize Demo
    import subprocess
    print("Running mission_simulator.py...")
    # Run the simulator script in fast mode (speed 5.0, few readings to make it quick)
    process = subprocess.Popen(
        ["python", "scripts/mission_simulator.py", "--speed", "20.0", "--readings", "30"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    # Wait for the simulator to finish
    out, err = process.communicate()
    
    # Check if the mission ID was generated. The script prints it or we can just fetch the latest mission.
    res = requests.get(f"{BASE_URL}/missions")
    missions = res.json()
    if not missions:
        print_result("Mission initialization", False, "No missions found")
        
    latest_mission = missions[0]['mission_id']
    print_result("Mission initialization", True, f"({latest_mission})")
    
    # Check if we have telemetry
    res = requests.get(f"{BASE_URL}/dashboard?mission_id={latest_mission}")
    dash = res.json()
    
    # 3. Telemetry generation
    has_telemetry = len(dash.get('flight_path', [])) > 0
    print_result("Telemetry generation", has_telemetry)
    
    # 4. Hotspot detection
    has_hotspots = len(dash.get('hotspots', [])) > 0
    print_result("Hotspot detection", has_hotspots)
    
    # 5-8: Check events for intelligence and decisions
    res = requests.get(f"{BASE_URL}/missions/{latest_mission}/replay")
    replay = res.json()
    
    events = replay.get('timeline', [])
    event_types = [e['type'] for e in events]
    
    print_result("Adaptive sampling", "SAMPLING_RECOMMENDED" in event_types)
    print_result("Environmental intelligence", "AI_INSIGHT_GENERATED" in event_types)
    print_result("Decision engine", "DECISION_RECOMMENDED" in event_types)
    print_result("Response simulation", "SIMULATION_COMPLETED" in event_types)
    print_result("Replay engine", len(events) > 5)
    
    # 10. Explainable intelligence
    payload = {
        "mission_id": latest_mission,
        "query": "Why did the risk become HIGH?",
        "context": {"event": "HOTSPOT_DETECTED"}
    }
    res = requests.post(f"{BASE_URL}/ai/ask", json=payload)
    if res.status_code == 200:
        ans = res.json()
        print_result("Explainable intelligence", "fact" in ans or "answer" in ans)
        
        # 13. AI grounding
        has_grounding = "retrieved_evidence" in ans or len(ans.get("facts", [])) > 0
        print_result("AI grounding", has_grounding)
    else:
        print_result("Explainable intelligence", False)
        print_result("AI grounding", False)
        
    # 12. Simulation isolation
    # Make sure flight_path doesn't contain SIMULATED data directly mixed without flags if applicable,
    # or that the simulator events have proper simulation_id.
    sim_events = [e for e in events if e['type'] == 'SIMULATION_COMPLETED']
    print_result("Simulation isolation", len(sim_events) > 0 and 'simulation_id' in sim_events[0].get('metadata', {}))

    # 11. Mission scorecard
    res = requests.get(f"{BASE_URL}/missions/{latest_mission}/report")
    if res.status_code == 200:
        report = res.json()
        print_result("Mission scorecard", "analytics" in report)
    else:
        print_result("Mission scorecard", False)
        
    print("\nEnd-to-End Verification Complete.")

if __name__ == "__main__":
    verify_demo()
