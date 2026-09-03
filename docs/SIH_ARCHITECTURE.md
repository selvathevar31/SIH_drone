# QUDRACOPTER System Architecture

## Core Data Flow

```mermaid
graph TD
    subgraph Telemetry Ingestion
    A[Drone Sensors] -->|JSON Stream| B(FastAPI Endpoint)
    B -->|Canonical Data Model| C[(SQLite DB)]
    end

    subgraph Intelligence Engine
    C --> D[Pollution Threshold Monitor]
    D -->|If PM2.5 > 35| E[Hotspot Detector]
    E --> F[Adaptive Sampling logic]
    end

    subgraph Grounded AI
    F --> G[RAG Context Builder]
    G --> H[Gemini / LLM]
    H -->|Facts & Inferences| I[Response Decision]
    end

    subgraph Simulation & Replay
    I --> J[Response Simulator]
    J -->|Synthetic Markers| K[Unified Event Timeline]
    K --> L[Mission Replay Engine]
    end

    subgraph Frontend Visualization
    C --> M[2D Leaflet Map]
    C --> N[3D Cesium Map]
    L --> O[Replay Intelligence Panel]
    end
```

## Component Architecture

1. **Telemetry Ingestion Layer:** Exposes `/api/telemetry` via FastAPI, enforces the `EnvironmentalRecord` schema.
2. **Decision Engine:** `adaptive_sampling.py` and `pollution_intelligence.py` analyze rolling averages and distance heuristics to trigger localized events.
3. **AI Grounding Layer:** `grounding.py` filters raw LLM responses. Any numerical claim must be sourced from the `retrieved_evidence`.
4. **Simulator:** `ResponseSimulation` creates purely synthetic events (with explicit tags) to visualize the AI's recommendations without actual drone movement.
5. **Replay Interface:** A highly-synchronized React component that parses `timestamp` logic to "time travel" through the mission.
