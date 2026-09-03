# QUDRACOPTER: SIH Demonstration Guide

This document outlines the setup, execution, and talking points for the SIH Final Demonstration of the QUDRACOPTER (FLUXX) Environmental Intelligence Platform.

## 1. System Architecture Overview
QUDRACOPTER is a complete Closed-Loop Environmental Response Platform. It operates across three distinct modes:
- **LIVE MODE:** Ingests live telemetry, detects hotspots, and dynamically flags zones.
- **HISTORICAL MODE:** Explores past missions for trend analysis and comparative metrics.
- **REPLAY MODE:** Deterministically replays missions to provide full explainability for every AI decision.

## 2. Setting Up the Demo
1. Ensure the backend is running (`uvicorn app.main:app --reload`).
2. Ensure the frontend is running (`npm run dev`).
3. Set the Gemini API key in `backend/.env` (if missing, the AI will use a deterministic fallback).

## 3. Demo Execution Procedure

### Stage 1: Mission Initialization
- Open the QUDRACOPTER Dashboard.
- From the UI Demo Control Center, instruct the backend to start a simulated mission by running `python scripts/mission_simulator.py`.
- **Talking Point:** "The system registers the mission and prepares the environmental data contract."

### Stage 2: Surveying & Telemetry Collection
- The dashboard will switch to **LIVE MODE**.
- The 2D and 3D maps will populate with drone telemetry.
- **Talking Point:** "We are receiving live PM1, PM2.5, and PM10 values. Notice how they are formatted strictly to our Canonical Data Model."

### Stage 3: Hotspot Detection
- The system automatically triggers a Hotspot Event when pollution thresholds are breached.
- **Talking Point:** "The Decision Engine operates completely autonomously. It does not wait for a human to notice the pollution spike."

### Stage 4: AI Environmental Analysis
- The AI Engine processes the hotspot and creates a Recommendation.
- **Talking Point:** "Our Grounded RAG AI processes the telemetry. It only uses approved facts. Let's look at the Explainability Panel."

### Stage 5: Response Simulation
- The simulator generates a projected flight path for deeper coverage.
- **Talking Point:** "Crucially, this is a simulated response. The UI explicitly separates REAL telemetry from SIMULATED data."

### Stage 6: Mission Replay & Explainability
- After completion, open the **Mission Replay** tab.
- Click **"Explain This Event"** on the timeline.
- **Talking Point:** "We don't just output numbers. We trace every decision through FACT -> INFERENCE -> DECISION -> RECOMMENDATION."

## 4. Known Limitations
- The simulation paths are pre-generated based on bounded algorithms rather than real-time aerodynamic physics.
- If the AI API is offline, the system degrades gracefully into "Grounded Fallback" mode, continuing to operate.

## 5. What AI Can and Cannot Claim
- **CAN:** Analyze PM2.5 values against thresholds and suggest bounding box expansions.
- **CANNOT:** Invent pollution values, hallucinate locations, or claim real flight commands were sent to the drone.
