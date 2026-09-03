# FLUXX End-to-End Mission Simulator & Integration Demo

This document outlines the step-by-step instructions to run, verify, and demonstrate the complete FLUXX ecosystem using the end-to-end mission simulator.

---

## 1. Prerequisites & Starting Services

To run the demonstration, start the backend API server and frontend React application:

### Step 1: Start Backend API Server
Navigate to the `backend/` directory, activate the virtual environment, and start the Uvicorn server:
```powershell
cd c:\projects\drone\backend
..\venv\Scripts\python.exe -m uvicorn app.main:app --reload
```
The server will start at `http://localhost:8000`.

### Step 2: Start Frontend Application
Navigate to the root directory and start the Vite dev server:
```powershell
cd c:\projects\drone
npm run dev
```
The frontend application will be available at `http://localhost:5173`.

---

## 2. Running a Drone Simulation

The Mission Simulator CLI script simulates a drone performing a lawnmower grid survey with realistic battery discharge, logical heading changes, altitude scaling, and local pollution hotspot gradients.

### Step 3: Run the First Simulation (Morning Survey)
Open a new terminal window and run:
```powershell
cd c:\projects\drone\backend
..\venv\Scripts\python.exe scripts/mission_simulator.py --mission-name "SIM-Morning-Survey" --speed 5 --readings 150
```
* **`--speed 5`**: Accelerates flight telemetry transmission (1 reading every 200ms instead of 2 seconds).
* **`--readings 150`**: Captures a grid scan covering takeoff, survey, return, and landing.

---

## 3. Watching the Live Dashboard Integration

While the simulator is active, open `http://localhost:5173/` in your browser.

1. **Auto-Switching**: The dashboard will automatically detect the active `SIM-Morning-Survey` mission and switch to it.
2. **Live Feed Toggle**: The header's "Live" toggle will activate, enabling 2D and 3D telemetry polling.
3. **Telemetry updates**: Watch the drone icon crawl the map, the route line extend, and the live status dials (speed, altitude, battery percentage) dynamically adjust.
4. **Hotspot Detection**:
   * As the drone approaches coordinate `(start_lat + 0.0015, start_lon + 0.0015)`, PM2.5 levels rise to ~185 µg/m³.
   * The status switches to `HOTSPOT_DETECTED`.
   * Hotspot markers dynamically appear on the maps.
5. **Adaptive Sampling**:
   * The system automatically generates a blue circular region labeled **`RECOMMENDED SAMPLING ZONE`** around high-gradient sparse points.
   * This is visible on both the **2D Leaflet Map** and the **3D Cesium Map**.

---

## 4. Querying the Grounded AI & RAG Pipeline

Once the simulation completes and the status becomes `COMPLETED`, test the RAG integration:

1. Click on the **AI Assistant** in the sidebar.
2. Ask the assistant:
   > *"What was the highest PM2.5?"*
3. The AI retrieves actual database telemetry points and answers truthfully (e.g. `185.2 µg/m³`).
4. Click on the **Evidence Drawer** to review the retrieved database records.
5. Ask:
   > *"Is that level concerning?"*
6. The AI matches the retrieved telemetry against local knowledge references (CPCB definitions, health categories) and provides safety explanations based on grounded documents.

---

## 5. Running a Second Mission & Historical Comparison

To demonstrate spatial comparisons and historical analytics, run a second survey with different variables (e.g. lower speed or different conditions).

### Step 4: Run the Second Simulation (Evening Survey)
```powershell
..\venv\Scripts\python.exe scripts/mission_simulator.py --mission-name "SIM-Evening-Survey" --speed 5 --readings 150 --seed 999
```

Once completed:
1. Open the **Historical Comparison** view in the sidebar.
2. Select **`SIM-Evening-Survey`** as current, and **`SIM-Morning-Survey`** as previous.
3. Review the comparisons showing:
   * AQI change percentage.
   * PM2.5 and PM10 divergence.
   * Spatial difference map overlays.

---

## 6. Inspecting the Public Portal

To verify public awareness constraints:

1. Click on **Public Portal** in the sidebar.
2. Review the public status overview.
3. Verify that all drone-diagnostic fields (`battery`, `signal_strength`, `satellites`, `gps_status`, `altitude`) are fully stripped and hidden from this view.
4. Try the public AI query. The response cites approved public documents but keeps the prompt template and raw retrieval database details completely private.

---

## 7. Cleaning Up Demo Data

To wipe all simulation databases:
```powershell
cd c:\projects\drone\backend
..\venv\Scripts\python.exe scripts/reset_demo.py
```
Type `y` when prompted. This securely purges demo records (`SIM-` prefix) while leaving production datasets intact.
