const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

export async function getMissions(signal) {
    const res = await fetch(`${API_URL}/missions`, { signal });
    if (!res.ok) throw new Error("Failed to fetch missions");
    return res.json();
}

export async function getDashboard(missionId, signal) {
    const res = await fetch(`${API_URL}/dashboard/${missionId}`, { signal });
    if (!res.ok) throw new Error("Failed to fetch dashboard data");
    return res.json();
}

export async function getEnvironmentMap(missionId, signal) {
    const res = await fetch(`${API_URL}/missions/${missionId}/environment-map`, { signal });
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
