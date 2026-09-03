const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

export async function getMissions(signal) {
    const res = await fetch(`${API_URL}/missions`, { signal });
    if (!res.ok) throw new Error("Failed to fetch missions");
    return res.json();
}

export async function getDashboard(missionId, params = {}, signal) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${API_URL}/dashboard/${missionId}?${query}` : `${API_URL}/dashboard/${missionId}`;
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error("Failed to fetch dashboard data");
    return res.json();
}

export async function getEnvironmentMap(missionId, params = {}, signal) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${API_URL}/missions/${missionId}/environment-map?${query}` : `${API_URL}/missions/${missionId}/environment-map`;
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error("Failed to fetch environment map");
    return res.json();
}

export async function getMissionReadings(missionId, params = {}, signal) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_URL}/missions/${missionId}/readings?${query}`, { signal });
    if (!res.ok) throw new Error("Failed to fetch readings");
    return res.json();
}

export function downloadMissionReadingsCSV(missionId, params = {}) {
    const query = new URLSearchParams(params).toString();
    window.location.href = `${API_URL}/missions/${missionId}/readings/export?${query}`;
}

export async function uploadCSV(file, missionId = null) {
    const formData = new FormData();
    formData.append("file", file);
    if (missionId) {
        formData.append("mission_id", missionId);
    }
    
    const res = await fetch(`${API_URL}/upload/csv`, {
        method: "POST",
        body: formData
    });
    
    
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Upload failed");
    }
    return res.json();
}

export async function loadDemoCSV() {
    const res = await fetch(`${API_URL}/upload/demo-csv`, {
        method: "POST"
    });
    
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to load demo CSV");
    }
    return res.json();
}

export async function getMissionAnalytics(missionId, signal) {
    const res = await fetch(`${API_URL}/missions/${missionId}/analytics`, { signal });
    if (!res.ok) throw new Error("Failed to fetch mission analytics");
    return res.json();
}

export async function compareMissions(currentMissionId, previousMissionId, signal) {
    const res = await fetch(`${API_URL}/missions/${currentMissionId}/compare/${previousMissionId}`, { signal });
    if (!res.ok) throw new Error("Failed to fetch comparison data");
    return res.json();
}

export async function getEnvironmentalAnalytics(missionId, signal) {
    const res = await fetch(`${API_URL}/missions/${missionId}/environmental-analytics`, { signal });
    if (!res.ok) throw new Error("Failed to fetch environmental analytics");
    return res.json();
}

export async function getPollutionZones(missionId, signal) {
    const res = await fetch(`${API_URL}/missions/${missionId}/zones`, { signal });
    if (!res.ok) throw new Error("Failed to fetch pollution zones");
    return res.json();
}

export async function getPersistentHotspots(signal) {
    const res = await fetch(`${API_URL}/hotspots/persistent`, { signal });
    if (!res.ok) throw new Error("Failed to fetch persistent hotspots");
    return res.json();
}

export async function getAltitudeProfile(missionId, params = {}, signal) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${API_URL}/missions/${missionId}/altitude-profile?${query}` : `${API_URL}/missions/${missionId}/altitude-profile`;
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error("Failed to fetch altitude profile");
    return res.json();
}

export async function getSamplingDensity(missionId, params = {}, signal) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${API_URL}/missions/${missionId}/sampling-density?${query}` : `${API_URL}/missions/${missionId}/sampling-density`;
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error("Failed to fetch sampling density");
    return res.json();
}

export async function getFlightPath(missionId, params = {}, signal) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${API_URL}/missions/${missionId}/flight-path?${query}` : `${API_URL}/missions/${missionId}/flight-path`;
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error("Failed to fetch flight path");
    return res.json();
}

export async function queryAI(missionId, question) {
    const res = await fetch(`${API_URL}/ai/query`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ mission_id: missionId, question })
    });
    if (!res.ok) throw new Error("AI query failed");
    return res.json();
}

export async function getAIInsights(missionId) {
    const res = await fetch(`${API_URL}/ai/insights/${missionId}`);
    if (!res.ok) throw new Error("Failed to fetch AI insights");
    return res.json();
}

// ── Public Awareness API Client Functions ────────────────────────────────────

export async function getPublicOverview(signal) {
    const res = await fetch(`${API_URL}/public/overview`, { signal });
    if (!res.ok) throw new Error("Failed to fetch public overview");
    return res.json();
}

export async function getPublicMissions(signal) {
    const res = await fetch(`${API_URL}/public/missions`, { signal });
    if (!res.ok) throw new Error("Failed to fetch public missions");
    return res.json();
}

export async function getPublicMission(missionId, signal) {
    const res = await fetch(`${API_URL}/public/missions/${missionId}`, { signal });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to fetch public mission details");
    }
    return res.json();
}

export async function getPublicMap(missionId, signal) {
    const res = await fetch(`${API_URL}/public/missions/${missionId}/map`, { signal });
    if (!res.ok) throw new Error("Failed to fetch public map data");
    return res.json();
}

export async function getPublicTrend(missionId, signal) {
    const res = await fetch(`${API_URL}/public/missions/${missionId}/trend`, { signal });
    if (!res.ok) throw new Error("Failed to fetch public trend data");
    return res.json();
}

export async function getPublicHotspots(signal) {
    const res = await fetch(`${API_URL}/public/hotspots`, { signal });
    if (!res.ok) throw new Error("Failed to fetch public hotspots");
    return res.json();
}

export async function askPublicAI(missionId, question, signal) {
    const res = await fetch(`${API_URL}/public/ai/query`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ mission_id: missionId, question }),
        signal
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Public AI query failed");
    }
    return res.json();
}

