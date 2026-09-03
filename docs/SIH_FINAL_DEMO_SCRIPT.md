# QUDRACOPTER - SIH FINAL DEMO SCRIPT

## Pre-Flight Checklist
Before the judges arrive:
1. Ensure the frontend (`npm run dev`) and backend (`uvicorn`) are running.
2. Click **Reset & Delete All Data** (if needed) in the Settings panel to ensure a clean state.
3. Open `http://localhost:5173/` in a 1366x768 or 1080p maximized window.
4. Set the UI to **Overview**.

---

## The Demonstration Flow (16 Steps)

### STEP 1: The Pitch & Overview
* **Action:** Open the **Overview** tab. Do not click anything yet.
* **Script:** "Welcome to QUDRACOPTER. This is our unified Environmental Intelligence dashboard designed for real-time monitoring of urban pollution. On this screen, we combine live telemetry from our drone swarm with multi-dimensional analytics. Notice the clean separation of status, geographic mapping, analytics, and AI intelligence."
* **Judge Observation:** The UI is clean, no empty charts, and the layout prioritizes live data.

### STEP 2: Initiate Live Mission
* **Action:** Navigate to **Settings** and click **"Start Simulator"**. Return to **Overview**.
* **Script:** "We will now launch a live survey mission over the target zone. The drone is autonomously following a grid pattern while sampling PM2.5, PM10, and AQI at different altitudes."
* **Judge Observation:** The map begins tracing the flight path. Live Metric cards switch to the Live Telemetry layout.

### STEP 3: Pollution Hotspot Detection
* **Action:** Wait ~30 seconds for the drone to enter the red/orange zones on the map.
* **Script:** "The drone has just entered a region with elevated pollution levels. You can see the Live Alerts feed immediately flag a 'HOTSPOT DETECTED'. Our system isn't just recording data; it's actively analyzing the geospatial boundaries of these hazardous zones."
* **Judge Observation:** Red hotspot boundaries appear on the map, and a critical alert is added to the log.

### STEP 4: Adaptive Sampling Activation
* **Action:** Direct attention to the `Adaptive Sampling Status` card in the top right.
* **Script:** "Because a severe hotspot was detected, the AI has dynamically interrupted the standard grid flight and triggered 'Adaptive Sampling'. It is autonomously investigating the altitude column above the hotspot to map the vertical dispersion of the pollutants."

### STEP 5: AI Environmental Intelligence
* **Action:** Scroll down to the **AI Environmental Intelligence** panel.
* **Script:** "Our grounded AI processes this raw data into actionable intelligence. As you can see, it has classified the risk level and extracted key facts."
* **Action:** Point out the **RECOMMENDATION ONLY** badge.
* **Script:** "Crucially, the AI only provides recommendations. It cannot unilaterally alter mission parameters without human-in-the-loop authorization, guaranteeing operational safety."

### STEP 6: Grounded AI Assistant (Q&A)
* **Action:** Type in the AI Assistant: *"What was the highest AQI recorded and where is it?"*
* **Script:** "We can interrogate the data naturally. The AI uses strict RAG retrieval against the current mission's spatial database, ensuring zero hallucination. If I click 'Locate on Map' on its response, it drives the UI directly to the evidence."

### STEP 7: Environmental Decision Engine
* **Action:** Scroll to the bottom **Environmental Decision Engine**.
* **Script:** "The system has now synthesized the mission data into a formal Decision matrix. It has identified 'Vehicular Emissions' as the primary driver and generated a prioritized response plan to mitigate exposure or gather more data."

### STEP 8: Response Simulation
* **Action:** Click **"SIMULATE RESPONSE"**.
* **Script:** "Before deploying any resources, we can run a closed-loop simulation of the recommended actions. This projects the effectiveness of the intervention against the real-world baseline."
* **Judge Observation:** The system shows a 'Before/After' comparison and explicitly flags the results as `SIMULATION`.

### STEP 9: Transition to Replay
* **Action:** Click **"LAUNCH MISSION REPLAY"** at the bottom of the simulation.
* **Script:** "Once the live mission concludes, or for after-action review, we enter Mission Replay mode. This allows us to scrub through the entire mission timeline deterministically."

### STEP 10: Explainable Intelligence
* **Action:** In the Replay Timeline, find the 'Hotspot Detected' event and click **"Explain This Event"**.
* **Script:** "Transparency is critical for trust. For any automated event, we provide a full trace of *why* the system acted. You can see the explicit link between the sensor Fact, the derived Inference, the algorithmic Decision, and the final Recommendation."

### STEP 11: Mission Scorecard
* **Action:** Let the replay finish or skip to the end.
* **Script:** "Finally, the Mission Scorecard summarizes the intelligence pipeline. Notice how it strictly separates the actual 'Real Measurements' from the 'Simulated Response Results', preserving absolute data integrity for compliance and auditing."

---

## IF SOMETHING FAILS (Fallback Paths)
* **Maps not loading / Cesium black screen:** Ensure internet connectivity. Fallback: Switch to `2D MAP` mode immediately.
* **AI doesn't answer:** The backend NLP model might be restarting. Apologize for the cold-start delay, wait 10 seconds, and retry.
* **Simulation button disabled:** Ensure the live mission has progressed enough to generate at least one hotspot. Let it run for 15 more seconds.
