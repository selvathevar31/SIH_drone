import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MetricCards from './components/MetricCards';
import MissionMap from './components/MissionMap';
import MissionMap3D from './components/MissionMap3D';
import MissionAlerts from './components/MissionAlerts';
import MissionEvents from './components/MissionEvents';
import MissionInformation from './components/MissionInformation';
import RecentEvents from './components/RecentEvents';
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

function App() {
  const [missions, setMissions] = useState([]);
  const [selectedMission, setSelectedMission] = useState('');
  const [dashboardData, setDashboardData] = useState(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [backendOnline, setBackendOnline] = useState(true);
  
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [mapMode, setMapMode] = useState('2D'); // '2D' or '3D'
  
  // Live State & Events System
  const [liveState, setLiveState] = useState(null);
  const [events, setEvents] = useState([]);
  const [intelSummary, setIntelSummary] = useState(null);
  const [freshness, setFreshness] = useState('HISTORICAL');
  
  const [currentView, setCurrentView] = useState('overview'); // 'overview' or 'explorer'
  const [mapLocateTarget, setMapLocateTarget] = useState(null);
  
  // Time filter state
  const [timeFilter, setTimeFilter] = useState('ALL'); // 'ALL', '30M', '15M', '5M'

  const abortControllerRef = useRef(null);
  const isFetchingRef = useRef(false);

  const pollInterval = parseInt(import.meta.env.VITE_POLL_INTERVAL || '2000', 10);

  // Poll missions list to detect active simulated missions & update list
  useEffect(() => {
    const pollMissions = async () => {
      try {
        const data = await getMissions();
        setMissions(data);
        setBackendOnline(true);
        
        // 1. Initial selection if none exists
        if (data.length > 0 && !selectedMission) {
          setSelectedMission(data[0].mission_id);
        }
        
        // 2. Auto-switch to active in-progress simulation if detected
        const activeSim = data.find(m => 
          m.status && 
          ['TAKEOFF', 'SURVEYING', 'HOTSPOT_DETECTED', 'RETURNING', 'LANDING'].includes(m.status)
        );
        
        if (activeSim && selectedMission !== activeSim.mission_id) {
          setSelectedMission(activeSim.mission_id);
          setIsLive(true);
          console.log(`[FLUXX] Auto-switched to active simulation: ${activeSim.mission_id}`);
        }
        
        if (data.length === 0) {
          setIsLoading(false);
        }
      } catch (err) {
        setBackendOnline(false);
        // Only show fatal error on initial load when there is no dashboard data yet
        if (!dashboardData) {
          setError("BACKEND CONNECTION LOST. Unable to retrieve missions.");
          setIsLoading(false);
        }
      }
    };
    
    pollMissions();
    const interval = setInterval(pollMissions, 4000);
    return () => clearInterval(interval);
  }, [selectedMission, dashboardData]);

  const getTimeParams = (latestTimestamp) => {
    if (timeFilter === 'ALL' || !latestTimestamp) return {};
    
    // Parse latest timestamp and subtract minutes
    const endDt = new Date(latestTimestamp);
    let minutesToSubtract = 0;
    if (timeFilter === '30M') minutesToSubtract = 30;
    if (timeFilter === '15M') minutesToSubtract = 15;
    if (timeFilter === '5M') minutesToSubtract = 5;
    
    const startDt = new Date(endDt.getTime() - minutesToSubtract * 60000);
    return {
      start_time: startDt.toISOString(),
      end_time: endDt.toISOString()
    };
  };

  const fetchLiveStateData = async (missionId) => {
    try {
      const [liveStateRes, eventsRes, intelRes] = await Promise.all([
        fetch(`http://localhost:8000/api/missions/${missionId}/live-state`).then(r => r.json()),
        fetch(`http://localhost:8000/api/missions/${missionId}/events`).then(r => r.json()),
        fetch(`http://localhost:8000/api/missions/${missionId}/intelligence`).then(r => r.json())
      ]);
      
      setLiveState(liveStateRes);
      setEvents(eventsRes);
      setIntelSummary(intelRes);
      
      if (isLive) {
        if (liveStateRes.latest_timestamp) {
          const lastTime = new Date(liveStateRes.latest_timestamp);
          const diff = Math.floor((new Date() - lastTime) / 1000);
          if (diff <= 10) {
            setFreshness("LIVE");
          } else {
            setFreshness(`STALE (Last update ${diff}s ago)`);
          }
        } else {
          setFreshness("STALE (No readings)");
        }
      } else {
        setFreshness("HISTORICAL");
      }
      setBackendOnline(true);
    } catch (err) {
      console.error("Live state fetch error:", err);
      setFreshness("OFFLINE");
      setBackendOnline(false);
    }
  };

  // Fetch dashboard data whenever mission changes or poll triggers
  const fetchDashboard = async (missionId, isBackgroundPoll = false) => {
    if (!missionId || isFetchingRef.current) return;
    
    isFetchingRef.current = true;
    if (!isBackgroundPoll) setIsLoading(true);
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      // First, get base dashboard without time filter to find latest timestamp
      const baseData = await getDashboard(missionId, {}, abortControllerRef.current.signal);
      
      let finalData = baseData;
      const latestTimestamp = baseData.mission.end_time || (baseData.trend && baseData.trend.length > 0 ? baseData.trend[baseData.trend.length-1].timestamp : null);
      
      const timeParams = getTimeParams(latestTimestamp);
      
      // If filtering is applied, refetch with filters
      if (timeFilter !== 'ALL' && Object.keys(timeParams).length > 0) {
          finalData = await getDashboard(missionId, timeParams, abortControllerRef.current.signal);
          // Preserve mission stats from baseData since filtering removes historical context
          finalData.mission = baseData.mission; 
      }

      setDashboardData(finalData);
      setLastUpdated(new Date().toLocaleTimeString());
      setBackendOnline(true);
      setError(null);
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log("Stale request aborted");
      } else {
        setBackendOnline(false);
        if (!isBackgroundPoll) {
          setError("BACKEND CONNECTION LOST. Unable to retrieve mission telemetry.");
        }
      }
    } finally {
      if (!isBackgroundPoll) setIsLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    if (selectedMission) {
      fetchDashboard(selectedMission);
      fetchLiveStateData(selectedMission);
    }
  }, [selectedMission, timeFilter]);

  // Polling logic for Live mode
  useEffect(() => {
    let interval;
    if (isLive && selectedMission) {
      fetchLiveStateData(selectedMission);
      interval = setInterval(() => {
        fetchDashboard(selectedMission, true);
        fetchLiveStateData(selectedMission);
      }, pollInterval);
    }
    return () => clearInterval(interval);
  }, [isLive, selectedMission, timeFilter]);

  const handleMissionUploaded = (newMissionId) => {
    getMissions().then(data => {
      setMissions(data);
      setSelectedMission(newMissionId);
    });
  };

  const handleLocateOnMap = (reading) => {
    setCurrentView('overview');
    setMapMode('2D');
    setMapLocateTarget([reading.latitude, reading.longitude]);
  };

  // Derive timeParams for child components
  const latestTimestamp = dashboardData?.mission?.end_time;
  const timeParams = getTimeParams(latestTimestamp);
  
  // Use canonical telemetry for components
  const telemetryData = dashboardData?.telemetry || [];

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
      <Header 
        missions={missions} 
        selectedMission={selectedMission} 
        setSelectedMission={setSelectedMission}
        isLive={currentView === 'replay' ? false : isLive}
        setIsLive={setIsLive}
        backendOnline={backendOnline}
        lastUpdated={lastUpdated}
        liveData={liveState}
        freshness={currentView === 'replay' ? 'REPLAY' : freshness}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar onUploadSuccess={handleMissionUploaded} currentView={currentView} setCurrentView={setCurrentView} />
        
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar relative">
          
          {isLoading && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 border-4 border-telemetry border-t-transparent rounded-full animate-spin mb-4"></div>
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
                  onClick={() => {
                    if (selectedMission) fetchDashboard(selectedMission);
                    else window.location.reload();
                  }}
                  className="px-6 py-2 bg-surface-elevated hover:bg-surface-secondary border border-border rounded font-semibold text-text-primary uppercase tracking-wide transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {!error && !isLoading && !dashboardData && missions.length === 0 && (
            <div className="absolute inset-0 z-40 flex items-center justify-center">
              <div className="text-center">
                <div className="text-text-muted font-bold tracking-widest mb-2 uppercase">No Missions Available</div>
                <div className="text-text-secondary text-sm">Upload a CSV mission to begin.</div>
              </div>
            </div>
          )}

          {selectedMission && !isLoading && !error && currentView === 'explorer' && (
            <DataExplorer 
              missionId={selectedMission}
              onLocateOnMap={handleLocateOnMap}
            />
          )}

          {currentView === 'history' && (
            <FlightHistory />
          )}

          {currentView === 'comparison' && (
            <HistoricalComparison missions={missions} />
          )}

          {currentView === 'public' && (
            <PublicDashboard />
          )}

          {currentView === 'replay' && selectedMission && dashboardData && (
            <MissionReplay 
              missionId={selectedMission} 
              dashboardData={dashboardData}
              onExit={() => setCurrentView('overview')}
            />
          )}

          {currentView === 'settings' && (
            <SettingsPanel />
          )}

          {dashboardData && !isLoading && !error && currentView === 'overview' && (
            <div className="max-w-[1920px] mx-auto flex flex-col gap-4 lg:gap-6">
              
              {/* TOP STATUS BAR */}
              <div className="flex justify-between items-center bg-surface-elevated px-4 py-2 rounded-lg border border-border shadow-sm">
                <div className="flex items-center gap-6">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-text-muted font-bold tracking-widest uppercase">Mission ID</span>
                    <span className="text-sm font-mono font-bold text-telemetry">{dashboardData.mission.mission_id}</span>
                  </div>
                  <div className="h-6 w-px bg-border/50"></div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-text-muted font-bold tracking-widest uppercase">Status</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-safe animate-pulse"></div>
                      <span className="text-xs font-bold text-safe uppercase tracking-wider">Active</span>
                    </div>
                  </div>
                  <div className="h-6 w-px bg-border/50 hidden md:block"></div>
                  <div className="flex-col hidden md:flex">
                    <span className="text-[10px] text-text-muted font-bold tracking-widest uppercase">System</span>
                    <span className="text-xs font-bold text-text-primary uppercase tracking-wider">Nominal</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-text-muted text-xs font-mono font-bold uppercase hidden lg:flex">
                    <Clock className="w-4 h-4" /> Global Time Filter
                  </div>
                  <div className="flex gap-1 bg-surface-secondary p-0.5 rounded border border-border">
                    {['ALL', '30M', '15M', '5M'].map(tf => (
                      <button
                        key={tf}
                        onClick={() => setTimeFilter(tf)}
                        className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded transition-colors ${timeFilter === tf ? 'bg-telemetry text-background shadow' : 'text-text-muted hover:text-text-primary'}`}
                      >
                        {tf === 'ALL' ? 'Full' : `${tf}`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* MAIN COMMAND CENTER GRID */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-6 min-h-[850px]">
                
                {/* LEFT: Intelligence Panel */}
                <div className="xl:col-span-3 flex flex-col gap-4 order-2 xl:order-1 h-full">
                  <IntelligencePanel 
                    telemetry={telemetryData} 
                    stats={dashboardData.mission_stats} 
                    hotspots={dashboardData.hotspots} 
                    mission={dashboardData.mission} 
                  />
                </div>

                {/* CENTER: Spatial Map & Charts */}
                <div className="xl:col-span-7 flex flex-col gap-4 order-1 xl:order-2 h-full">
                  <div className="h-[600px] w-full">
                    <AQIHeatmap telemetry={telemetryData} />
                  </div>
                  
                  {/* 2D and 3D Maps */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[400px]">
                    <MissionMap 
                      missionId={dashboardData.mission.mission_id}
                      flightPath={telemetryData} 
                      currentLocation={dashboardData.current_location} 
                      hotspots={dashboardData.hotspots}
                      telemetry={dashboardData.current_environment}
                    />
                    <MissionMap3D 
                      missionId={dashboardData.mission.mission_id}
                      flightPath={telemetryData} 
                      currentLocation={dashboardData.current_location} 
                      hotspots={dashboardData.hotspots}
                      telemetry={dashboardData.current_environment}
                    />
                  </div>
                  
                  {/* CHARTS BELOW MAPS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-[300px]">
                     <div className="h-full">
                       <PollutionTrendChart telemetry={telemetryData} mission={dashboardData.mission} />
                     </div>
                     <div className="h-full">
                       <PollutionAltitudeChart telemetry={telemetryData} />
                     </div>
                  </div>
                </div>

                {/* RIGHT: Metric Cards */}
                <div className="xl:col-span-2 flex flex-col gap-4 order-3 h-full">
                  <MetricCards stats={dashboardData.mission_stats} />
                </div>

              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
