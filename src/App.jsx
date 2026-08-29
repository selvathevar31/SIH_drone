import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MetricCards from './components/MetricCards';
import MissionMap from './components/MissionMap';
import MissionMap3D from './components/MissionMap3D';
import HotspotPanel from './components/HotspotPanel';
import PollutionTrendChart from './components/PollutionTrendChart';
import FlightTelemetry from './components/FlightTelemetry';
import MissionInformation from './components/MissionInformation';
import RecentEvents from './components/RecentEvents';
import DataExplorer from './components/DataExplorer';
import FlightHistory from './components/FlightHistory';
import HistoricalComparison from './components/HistoricalComparison';
import EnvironmentalAnalyticsPanel from './components/EnvironmentalAnalyticsPanel';
import ZonesPanel from './components/ZonesPanel';
import Pollution3DMap from './components/Pollution3DMap';
import { getMissions, getDashboard } from './services/api';

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
  
  const [currentView, setCurrentView] = useState('overview'); // 'overview' or 'explorer'
  const [mapLocateTarget, setMapLocateTarget] = useState(null);

  const abortControllerRef = useRef(null);
  const isFetchingRef = useRef(false);

  const pollInterval = parseInt(import.meta.env.VITE_POLL_INTERVAL || '2000', 10);

  // Initial load of missions
  useEffect(() => {
    const fetchInitialMissions = async () => {
      try {
        const data = await getMissions();
        setMissions(data);
        setBackendOnline(true);
        if (data.length > 0) {
          setSelectedMission(data[0].mission_id);
        } else {
          setIsLoading(false);
        }
      } catch (err) {
        setBackendOnline(false);
        setError("BACKEND CONNECTION LOST. Unable to retrieve missions.");
        setIsLoading(false);
      }
    };
    fetchInitialMissions();
  }, []);

  // Fetch dashboard data whenever mission changes or poll triggers
  const fetchDashboard = async (missionId, isBackgroundPoll = false) => {
    if (!missionId || isFetchingRef.current) return;
    
    isFetchingRef.current = true;
    if (!isBackgroundPoll) setIsLoading(true);
    
    // Abort stale requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const data = await getDashboard(missionId, abortControllerRef.current.signal);
      setDashboardData(data);
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

  // Change mission handler
  useEffect(() => {
    if (selectedMission) {
      fetchDashboard(selectedMission);
    }
  }, [selectedMission]);

  // Polling logic for Live mode
  useEffect(() => {
    let interval;
    if (isLive && selectedMission) {
      interval = setInterval(() => {
        fetchDashboard(selectedMission, true);
      }, pollInterval);
    }
    return () => clearInterval(interval);
  }, [isLive, selectedMission]);

  // Handler for mission upload success
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

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
      <Header 
        missions={missions} 
        selectedMission={selectedMission} 
        setSelectedMission={setSelectedMission}
        isLive={isLive}
        setIsLive={setIsLive}
        backendOnline={backendOnline}
        lastUpdated={lastUpdated}
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

          {dashboardData && !isLoading && !error && currentView === 'overview' && (
            <div className="max-w-[1920px] mx-auto flex flex-col gap-4 lg:gap-6">
              
              <MetricCards data={dashboardData.current_environment} />

              <EnvironmentalAnalyticsPanel missionId={dashboardData.mission.mission_id} />
              
              <ZonesPanel missionId={dashboardData.mission.mission_id} />
              
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
                <div className="lg:col-span-3 flex flex-col gap-2">
                  {/* Map Mode Toggle */}
                  <div className="flex bg-surface-elevated rounded border border-border p-1 w-72 self-end">
                    <button 
                      onClick={() => setMapMode('2D')}
                      className={`flex-1 text-xs font-bold uppercase tracking-wider py-1.5 rounded transition-colors ${mapMode === '2D' ? 'bg-telemetry text-background shadow' : 'text-text-muted hover:text-text-primary'}`}
                    >
                      2D Map
                    </button>
                    <button 
                      onClick={() => setMapMode('3D')}
                      className={`flex-1 text-xs font-bold uppercase tracking-wider py-1.5 rounded transition-colors ${mapMode === '3D' ? 'bg-telemetry text-background shadow' : 'text-text-muted hover:text-text-primary'}`}
                    >
                      3D Drone
                    </button>
                    <button 
                      onClick={() => setMapMode('3D Profile')}
                      className={`flex-1 text-xs font-bold uppercase tracking-wider py-1.5 rounded transition-colors ${mapMode === '3D Profile' ? 'bg-telemetry text-background shadow' : 'text-text-muted hover:text-text-primary'}`}
                    >
                      3D Profile
                    </button>
                  </div>

                  {mapMode === '2D' ? (
                    <MissionMap 
                      missionId={dashboardData.mission.mission_id}
                      flightPath={dashboardData.flight_path} 
                      currentLocation={dashboardData.current_location} 
                      hotspots={dashboardData.hotspots}
                      telemetry={dashboardData.current_environment}
                      mapLocateTarget={mapLocateTarget}
                    />
                  ) : mapMode === '3D Profile' ? (
                    <Pollution3DMap missionId={dashboardData.mission.mission_id} />
                  ) : (
                    <MissionMap3D 
                      flightPath={dashboardData.flight_path} 
                      currentLocation={dashboardData.current_location} 
                      hotspots={dashboardData.hotspots}
                      telemetry={dashboardData.current_environment}
                    />
                  )}
                </div>
                <div className="lg:col-span-1">
                  <HotspotPanel hotspots={dashboardData.hotspots} />
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
                <div className="lg:col-span-2 min-h-[300px]">
                  <PollutionTrendChart trend={dashboardData.trend} mission={dashboardData.mission} />
                </div>
                <div className="lg:col-span-1">
                  <div className="flex flex-col gap-4 lg:gap-6 h-full">
                    <div className="flex-1 min-h-[200px]">
                      <FlightTelemetry telemetry={dashboardData.telemetry} />
                    </div>
                    <div className="flex-1 min-h-[220px]">
                      <MissionInformation mission={dashboardData.mission} />
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-1 min-h-[300px]">
                  <RecentEvents events={dashboardData.recent_events} />
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
