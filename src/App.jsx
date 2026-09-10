import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MetricCards from './components/MetricCards';
import MissionMap from './components/MissionMap';
import MissionMap3D from './components/MissionMap3D';
import DataExplorer from './components/DataExplorer';
import FlightHistory from './components/FlightHistory';
import HistoricalComparison from './components/HistoricalComparison';
import PublicDashboard from './components/PublicDashboard';
import SettingsPanel from './components/SettingsPanel';
import MissionReplay from './components/MissionReplay';
import { getMissions, getDashboard } from './services/api';
import { Clock } from 'lucide-react';
import PollutionTrendChart from './components/PollutionTrendChart';
import PollutionAltitudeChart from './components/PollutionAltitudeChart';
import AQIHeatmap from './components/AQIHeatmap';
import IntelligencePanel from './components/IntelligencePanel';
import DatasetSelector, { cityColor } from './components/DatasetSelector';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function extractCityLabel(missionId, dataSource) {
  // Try to derive a human-readable city name:
  // 1. From data_source (CSV filename without extension)
  if (dataSource && typeof dataSource === 'string') {
    const name = dataSource.replace(/\.(csv|CSV)$/, '').replace(/[_-]/g, ' ').trim();
    if (name && name.length > 0) return name;
  }
  // 2. Fallback: short mission ID
  return missionId ? missionId.slice(0, 14) : 'Unknown';
}

function computeStats(telemetry) {
  const aqis = (telemetry || []).map(p => p.aqi).filter(v => isFinite(v));
  if (!aqis.length) return null;
  return {
    min: Math.min(...aqis),
    max: Math.max(...aqis),
    avg: aqis.reduce((a, b) => a + b, 0) / aqis.length,
    count: aqis.length,
  };
}

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  const [missions, setMissions] = useState([]);

  // ── Multi-Dataset Store ────────────────────────────────────────────────────
  // Map<missionId → { dashboardData, telemetry, cityLabel, stats }>
  // NEVER replaced — only accumulated.
  const [datasetStore, setDatasetStore] = useState(new Map());

  // Which dataset is "primary" (drives panels + charts)
  const [activeDatasetId, setActiveDatasetId] = useState('');

  // Which dataset is temporarily highlighted via map hover
  // null = use activeDatasetId
  const [hoveredDatasetId, setHoveredDatasetId] = useState(null);

  // ── Legacy state kept for non-overview views ───────────────────────────────
  const [selectedMission, setSelectedMission] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [backendOnline, setBackendOnline] = useState(true);

  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [mapMode, setMapMode] = useState('2D');

  const [liveState, setLiveState] = useState(null);
  const [events, setEvents] = useState([]);
  const [intelSummary, setIntelSummary] = useState(null);
  const [freshness, setFreshness] = useState('HISTORICAL');

  const [currentView, setCurrentView] = useState('overview');
  const [mapLocateTarget, setMapLocateTarget] = useState(null);
  const [timeFilter, setTimeFilter] = useState('ALL');

  const abortControllerRef = useRef(null);
  const isFetchingRef = useRef(false);
  const pollInterval = parseInt(import.meta.env.VITE_POLL_INTERVAL || '2000', 10);

  useEffect(() => {
    const handleConnectionLost = () => {
      setBackendOnline(false);
      setError('BACKEND CONNECTION LOST. Network Error.');
    };
    window.addEventListener('backend-connection-lost', handleConnectionLost);
    return () => window.removeEventListener('backend-connection-lost', handleConnectionLost);
  }, []);

  // ── Derived active/hovered dataset ────────────────────────────────────────
  const effectiveDatasetId = hoveredDatasetId || activeDatasetId;
  const activeEntry   = datasetStore.get(activeDatasetId)   || null;
  const effectiveEntry = datasetStore.get(effectiveDatasetId) || activeEntry;

  const dashboardData  = activeEntry?.dashboardData  || null;
  const telemetryData  = effectiveEntry?.telemetry   || [];
  const effectiveMission = effectiveEntry?.dashboardData?.mission || dashboardData?.mission || null;

  // Ordered array of datasets for selector + heatmap (most recent first)
  const datasetsArray = useMemo(() => {
    const arr = [];
    datasetStore.forEach((v, k) => arr.push({ missionId: k, ...v }));
    return arr.reverse(); // most recently added first
  }, [datasetStore]);

  // ── Add or update a dataset in the store ──────────────────────────────────
  const upsertDataset = useCallback((missionId, dashData, missionMeta) => {
    const telemetry = dashData?.telemetry || [];
    const cityLabel = extractCityLabel(
      missionId,
      missionMeta?.data_source || dashData?.mission?.data_source,
    );
    const stats = computeStats(telemetry);

    setDatasetStore(prev => {
      const next = new Map(prev);
      next.set(missionId, { dashboardData: dashData, telemetry, cityLabel, stats });
      return next;
    });
  }, []);

  // ── Fetch + store a single mission's dashboard data ────────────────────────
  const fetchAndStoreDataset = useCallback(async (missionId, missionMeta, isBackground = false) => {
    if (!missionId) return;
    try {
      const baseData = await getDashboard(missionId, {});
      upsertDataset(missionId, baseData, missionMeta);
      setBackendOnline(true);
      setError(null);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn(`[App] Failed to load dataset ${missionId}:`, err.message);
        if (!isBackground) setBackendOnline(false);
      }
    }
  }, [upsertDataset]);

  // ── Poll missions list ─────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const pollMissions = async () => {
      try {
        const data = await getMissions();
        if (!mounted) return;
        setMissions(data);
        setBackendOnline(true);

        // First load: populate store with up to 5 most recent missions
        if (datasetStore.size === 0 && data.length > 0) {
          const toLoad = data.slice(0, 5);
          for (const m of toLoad) {
            await fetchAndStoreDataset(m.mission_id, m, true);
          }
          if (!mounted) return;
          setActiveDatasetId(data[0].mission_id);
          setSelectedMission(data[0].mission_id);
          setIsLoading(false);
        }

        if (data.length === 0) setIsLoading(false);

        // Auto-switch to live simulation
        const activeSim = data.find(m =>
          m.status &&
          ['TAKEOFF', 'SURVEYING', 'HOTSPOT_DETECTED', 'RETURNING', 'LANDING'].includes(m.status),
        );
        if (activeSim && activeDatasetId !== activeSim.mission_id) {
          if (!datasetStore.has(activeSim.mission_id)) {
            await fetchAndStoreDataset(activeSim.mission_id, activeSim);
          }
          if (!mounted) return;
          setActiveDatasetId(activeSim.mission_id);
          setSelectedMission(activeSim.mission_id);
          setIsLive(true);
        }
      } catch (err) {
        if (!mounted) return;
        setBackendOnline(false);
        if (datasetStore.size === 0) {
          setError('BACKEND CONNECTION LOST. Unable to retrieve missions.');
          setIsLoading(false);
        }
      }
    };

    pollMissions();
    const interval = setInterval(pollMissions, 8000);
    return () => { mounted = false; clearInterval(interval); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run once; datasetStore changes handled internally

  const getTimeParams = (latestTimestamp) => {
    if (timeFilter === 'ALL' || !latestTimestamp) return {};
    const endDt = new Date(latestTimestamp);
    const mins = timeFilter === '30M' ? 30 : timeFilter === '15M' ? 15 : 5;
    const startDt = new Date(endDt.getTime() - mins * 60000);
    return { start_time: startDt.toISOString(), end_time: endDt.toISOString() };
  };

  const fetchLiveStateData = async (missionId) => {
    try {
      const [liveStateRes, eventsRes] = await Promise.all([
        fetch(`http://localhost:8000/api/missions/${missionId}/live-state`).then(r => r.json()),
        fetch(`http://localhost:8000/api/missions/${missionId}/events`).then(r => r.json()),
      ]);
      setLiveState(liveStateRes);
      setEvents(eventsRes);
      if (isLive && liveStateRes.latest_timestamp) {
        const diff = Math.floor((new Date() - new Date(liveStateRes.latest_timestamp)) / 1000);
        setFreshness(diff <= 10 ? 'LIVE' : `STALE (${diff}s ago)`);
      } else {
        setFreshness('HISTORICAL');
      }
      setBackendOnline(true);
    } catch {
      setFreshness('OFFLINE');
      setBackendOnline(false);
    }
  };

  // Refresh active dataset when time filter changes
  useEffect(() => {
    if (activeDatasetId) {
      fetchAndStoreDataset(activeDatasetId, null);
      fetchLiveStateData(activeDatasetId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDatasetId, timeFilter]);

  // Live polling for active dataset
  useEffect(() => {
    if (!isLive || !activeDatasetId) return;
    const interval = setInterval(() => {
      fetchAndStoreDataset(activeDatasetId, null, true);
      fetchLiveStateData(activeDatasetId);
    }, pollInterval);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive, activeDatasetId, timeFilter]);

  // ── Upload handler: add new dataset WITHOUT replacing existing ones ─────────
  const handleMissionUploaded = useCallback(async (newMissionId, fileName) => {
    const allMissions = await getMissions();
    setMissions(allMissions);
    const meta = allMissions.find(m => m.mission_id === newMissionId) || { data_source: fileName };
    await fetchAndStoreDataset(newMissionId, meta);
    setActiveDatasetId(newMissionId);
    setSelectedMission(newMissionId);
    setLastUpdated(new Date().toLocaleTimeString());
  }, [fetchAndStoreDataset]);

  const handleLocateOnMap = (reading) => {
    setCurrentView('overview');
    setMapMode('2D');
    setMapLocateTarget([reading.latitude, reading.longitude]);
  };

  // ── Map hover handler: temporarily drive charts from hovered city ──────────
  const handleMapDatasetHover = useCallback((missionId) => {
    setHoveredDatasetId(missionId || null);
  }, []);

  // ── Overview render helpers ────────────────────────────────────────────────
  const latestTimestamp = dashboardData?.mission?.end_time;
  const timeParams = getTimeParams(latestTimestamp);

  const hasData = datasetStore.size > 0 && activeEntry !== null;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
      <Header
        missions={missions}
        selectedMission={activeDatasetId}
        setSelectedMission={(id) => {
          setActiveDatasetId(id);
          setSelectedMission(id);
          if (!datasetStore.has(id)) {
            const meta = missions.find(m => m.mission_id === id);
            fetchAndStoreDataset(id, meta);
          }
        }}
        isLive={currentView === 'replay' ? false : isLive}
        setIsLive={setIsLive}
        backendOnline={backendOnline}
        lastUpdated={lastUpdated}
        liveData={liveState}
        freshness={currentView === 'replay' ? 'REPLAY' : freshness}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          onUploadSuccess={handleMissionUploaded}
          currentView={currentView}
          setCurrentView={setCurrentView}
        />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar relative">

          {isLoading && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 border-4 border-telemetry border-t-transparent rounded-full animate-spin mb-4" />
                <div className="text-telemetry font-mono font-bold tracking-widest uppercase">Loading mission...</div>
              </div>
            </div>
          )}

          {error && !isLoading && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-background">
              <div className="border border-hazardous rounded-lg p-8 bg-surface-primary text-center max-w-md">
                <div className="text-hazardous font-bold uppercase tracking-wide mb-2 text-xl">Backend Connection Lost</div>
                <p className="text-text-secondary mb-6">{error}</p>
                <button
                  onClick={() => { if (activeDatasetId) fetchAndStoreDataset(activeDatasetId, null); else window.location.reload(); }}
                  className="px-6 py-2 bg-surface-elevated hover:bg-surface-secondary border border-border rounded font-semibold text-text-primary uppercase tracking-wide transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {!error && !isLoading && datasetStore.size === 0 && missions.length === 0 && (
            <div className="absolute inset-0 z-40 flex items-center justify-center">
              <div className="text-center">
                <div className="text-text-muted font-bold tracking-widest mb-2 uppercase">No Missions Available</div>
                <div className="text-text-secondary text-sm">Upload a CSV mission to begin.</div>
              </div>
            </div>
          )}

          {activeDatasetId && !isLoading && !error && currentView === 'explorer' && (
            <DataExplorer missionId={activeDatasetId} onLocateOnMap={handleLocateOnMap} />
          )}
          {currentView === 'history'    && <FlightHistory />}
          {currentView === 'comparison' && <HistoricalComparison missions={missions} />}
          {currentView === 'public'     && <PublicDashboard />}
          {currentView === 'settings'   && <SettingsPanel />}
          {currentView === 'replay' && activeDatasetId && dashboardData && (
            <MissionReplay
              missionId={activeDatasetId}
              dashboardData={dashboardData}
              onExit={() => setCurrentView('overview')}
            />
          )}

          {/* ── OVERVIEW ─────────────────────────────────────────────────── */}
          {hasData && !isLoading && !error && currentView === 'overview' && (
            <div className="max-w-[1920px] mx-auto flex flex-col gap-4">

              {/* TOP STATUS BAR */}
              <div className="flex justify-between items-center bg-surface-elevated px-4 py-2 rounded-lg border border-border">
                <div className="flex items-center gap-5">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-text-muted font-bold tracking-widest uppercase">Mission ID</span>
                    <span className="text-sm font-mono font-bold text-telemetry">{effectiveMission?.mission_id || activeDatasetId}</span>
                  </div>
                  {hoveredDatasetId && hoveredDatasetId !== activeDatasetId && (
                    <>
                      <div className="h-6 w-px bg-border/50" />
                      <div className="flex flex-col">
                        <span className="text-[10px] text-text-muted font-bold tracking-widest uppercase">Viewing</span>
                        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                          {datasetStore.get(hoveredDatasetId)?.cityLabel || hoveredDatasetId}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="h-6 w-px bg-border/50" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-text-muted font-bold tracking-widest uppercase">Status</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-safe animate-pulse" />
                      <span className="text-xs font-bold text-safe uppercase tracking-wider">Active</span>
                    </div>
                  </div>
                  <div className="h-6 w-px bg-border/50 hidden md:block" />
                  <div className="hidden md:flex flex-col">
                    <span className="text-[10px] text-text-muted font-bold tracking-widest uppercase">System</span>
                    <span className="text-xs font-bold text-text-primary uppercase tracking-wider">Nominal</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="hidden lg:flex items-center gap-2 text-text-muted text-[10px] font-bold uppercase tracking-widest">
                    <Clock className="w-3.5 h-3.5" /> Time Filter
                  </span>
                  <div className="flex gap-0.5 bg-surface-secondary p-0.5 rounded border border-border">
                    {['ALL', '30M', '15M', '5M'].map(tf => (
                      <button
                        key={tf}
                        onClick={() => setTimeFilter(tf)}
                        className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded transition-colors ${timeFilter === tf ? 'bg-telemetry text-background' : 'text-text-muted hover:text-text-primary'}`}
                      >
                        {tf === 'ALL' ? 'Full' : tf}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ROW 1: Intelligence | AQI Heatmap | HUD */}
              <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr_220px] gap-4 items-start">

                {/* LEFT — Intelligence + Dataset Selector */}
                <div className="flex flex-col gap-3 order-2 xl:order-1">
                  {/* Dataset Selector */}
                  <DatasetSelector
                    datasets={datasetsArray}
                    activeDatasetId={activeDatasetId}
                    hoveredDatasetId={hoveredDatasetId}
                    onSelect={(id) => {
                      setActiveDatasetId(id);
                      setSelectedMission(id);
                      setHoveredDatasetId(null);
                    }}
                  />
                  <IntelligencePanel
                    telemetry={effectiveEntry?.telemetry || []}
                    stats={effectiveEntry?.dashboardData?.mission_stats}
                    hotspots={effectiveEntry?.dashboardData?.hotspots}
                    mission={effectiveEntry?.dashboardData?.mission}
                  />
                </div>

                {/* CENTER — AQI Spatial Heatmap (all datasets, independent IDW per city) */}
                <div className="order-1 xl:order-2" style={{ height: 560 }}>
                  <AQIHeatmap
                    datasets={datasetsArray}
                    activeDatasetId={activeDatasetId}
                    hoveredDatasetId={hoveredDatasetId}
                    onDatasetHover={handleMapDatasetHover}
                  />
                </div>

                {/* RIGHT — Live Telemetry HUD */}
                <div className="flex flex-col gap-3 order-3">
                  <MetricCards stats={effectiveEntry?.dashboardData?.mission_stats} />
                </div>

              </div>

              {/* ROW 2: 2D Map + Satellite Map (all datasets shown) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ height: 420 }}>
                <MissionMap
                  missionId={activeDatasetId}
                  flightPath={activeEntry?.telemetry || []}
                  allDatasets={datasetsArray}
                  currentLocation={dashboardData?.current_location}
                  hotspots={dashboardData?.hotspots}
                  telemetry={dashboardData?.current_environment}
                  onDatasetHover={handleMapDatasetHover}
                />
                <MissionMap3D
                  missionId={activeDatasetId}
                  flightPath={activeEntry?.telemetry || []}
                  currentLocation={dashboardData?.current_location}
                  hotspots={dashboardData?.hotspots}
                  telemetry={dashboardData?.current_environment}
                />
              </div>

              {/* ROW 3: Charts (driven by hovered or active dataset) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ minHeight: 340 }}>
                <PollutionTrendChart
                  telemetry={telemetryData}
                  mission={effectiveMission}
                  cityLabel={effectiveEntry?.cityLabel}
                />
                <PollutionAltitudeChart
                  telemetry={telemetryData}
                  cityLabel={effectiveEntry?.cityLabel}
                />
              </div>

            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
