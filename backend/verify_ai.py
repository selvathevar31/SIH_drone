import urllib.request
import urllib.parse
import json

BASE_URL = "http://localhost:8000/api"

def query_ai(mission_id, question):
    url = f"{BASE_URL}/ai/query"
    data = json.dumps({
        "mission_id": mission_id,
        "question": question
    }).encode('utf-8')
    
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'}, method='POST')
    
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

def test_queries():
    # Fetch missions list first to find a valid mission_id
    req = urllib.request.Request(f"{BASE_URL}/missions", method='GET')
    try:
        with urllib.request.urlopen(req) as response:
            missions = json.loads(response.read().decode())
            if not missions:
                print("No missions in DB. Run verify_custom.py first to seed data.")
                return
            mission_id = missions[0]["mission_id"]
            print(f"Testing queries on mission: {mission_id}")
    except Exception as e:
        print("Failed to fetch missions:", e)
        return

    questions = [
        "Where is the highest PM2.5 concentration?",
        "Where is pollution highest?",
        "average pm10",
        "how many hotspots were detected?",
        "what happened during this mission?",
        "did pollution increase?",
        "compare this with previous mission",
        "what is the worst altitude?",
        "what is the weather tomorrow?"
    ]

    for q in questions:
        status, res = query_ai(mission_id, q)
        print(f"\nQuestion: {q}")
        print(f"Status: {status}")
        if status == 200:
            print(f"Type: {res.get('query_type')}")
            print(f"Answer: {res.get('answer')}")
            print(f"Confidence: {res.get('confidence')}")
            print(f"Source: {res.get('data_source')}")
        else:
            print(f"Error: {res}")

if __name__ == "__main__":
    test_queries()
