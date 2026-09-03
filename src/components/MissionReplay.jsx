import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Play, Pause, RotateCcw, FastForward, Clock, Activity, Map as MapIcon, ShieldAlert } from 'lucide-react';
import MissionMap from './MissionMap';
import MissionMap3D from './MissionMap3D';
import PollutionTrendChart from './PollutionTrendChart';
import ReplayIntelligence from './ReplayIntelligence';
import MissionEventTimeline from './MissionEventTimeline';
import MissionScorecard from './MissionScorecard';

export default function MissionReplay({ missionId, dashboardData, onExit }) {
  const [events, setEvents] = useState([]);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [elapsed, setElapsed] = useState(0);
  const [mapMode, setMapMode] = useState('2D');
  const [isFinished, setIsFinished] = useState(false);
  
  const [isLoading, setIsLoading] = useState(true);

  // Time boundaries
  const startTime = useMemo(() => {
    if (!dashboardData?.trend?.length) return 0;
    return new Date(dashboardData.trend[0].timestamp).getTime();
  }, [dashboardData]);

  const endTime = useMemo(() => {
    if (!dashboardData?.trend?.length) return 0;
    return new Date(dashboardData.trend[dashboardData.trend.length - 1].timestamp).getTime();
  }, [dashboardData]);
  
  const totalDuration = endTime - startTime; // in ms

  useEffect(() => {
    // Fetch chronological replay events
    fetch(`http://localhost:8000/api/missions/${missionId}/replay`)
      .then(res => res.json())
      .then(data => {
        setEvents(data.events || []);
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  }, [missionId]);

  // Playback Loop
  const lastUpdateRef = useRef(Date.now());
  
  useEffect(() => {
    let frame;
    const loop = () => {
      if (isPlaying && !isFinished) {
        const now = Date.now();
        const delta = (now - lastUpdateRef.current) * speed;
        setElapsed(prev => {
          const next = prev + delta;
          if (next >= totalDuration) {
            setIsPlaying(false);
            setIsFinished(true);
            return totalDuration;
          }
          return next;
        });
        lastUpdateRef.current = now;
      }
      frame = requestAnimationFrame(loop);
    };
    
    if (isPlaying) {
      lastUpdateRef.current = Date.now();
      frame = requestAnimationFrame(loop);
    }
    
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, speed, totalDuration, isFinished]);

  // Derived current time
  const currentTimestamp = startTime + elapsed;

  // Data Slicing
  const slicedData = useMemo(() => {
    if (!dashboardData) return null;
    
    // Binary search could be used, but filter is fast enough for <10k on modern machines 
    // especially since we memoize it. But let's optimize the slice index.
    
    // Find index in trend
    let trendIdx = dashboardData.trend.findIndex(t => new Date(t.timestamp).getTime() > currentTimestamp);
    if (trendIdx === -1) trendIdx = dashboardData.trend.length;
    
    const slicedTrend = dashboardData.trend.slice(0, trendIdx);
    
    // Current environmental reading
    const currentEnv = slicedTrend.length > 0 ? slicedTrend[slicedTrend.length - 1] : dashboardData.current_environment;
    
    // Flight Path
    let pathIdx = dashboardData.flight_path.findIndex(p => new Date(p.timestamp).getTime() > currentTimestamp);
    if (pathIdx === -1) pathIdx = dashboardData.flight_path.length;
    const slicedPath = dashboardData.flight_path.slice(0, Math.max(1, pathIdx));
    const currentLocation = slicedPath.length > 0 ? {
      latitude: slicedPath[slicedPath.length - 1][0],
      longitude: slicedPath[slicedPath.length - 1][1],
      heading: 0, speed: 0, altitude: 0
    } : dashboardData.current_location;

    // Hotspots
    const slicedHotspots = dashboardData.hotspots.filter(h => {
      // Find event for this hotspot
      const hsEvent = events.find(e => e.type === "HOTSPOT_DETECTED" && (e.latitude === h.latitude || Math.abs(e.latitude - h.latitude) < 0.001));
      if (!hsEvent) return true; // If no event linked, just show it based on time (fallback)
      return new Date(hsEvent.timestamp).getTime() <= currentTimestamp;
    });

    return {
      trend: slicedTrend,
      flight_path: slicedPath,
      current_environment: currentEnv,
      current_location: currentLocation,
      hotspots: slicedHotspots
    };
  }, [dashboardData, currentTimestamp, events]);

  const activeEvents = useMemo(() => {
    return events.filter(e => new Date(e.timestamp).getTime() <= currentTimestamp);
  }, [events, currentTimestamp]);

  const currentEvent = activeEvents.length > 0 ? activeEvents[activeEvents.length - 1] : null;

  const handleSeek = (e) => {
    const val = Number(e.target.value);
    setElapsed(val);
    if (val < totalDuration) setIsFinished(false);
  };

  const formatTime = (ms) => {
    const totalSecs = Math.floor(ms / 1000);
    const m = Math.floor(totalSecs / 60).toString().padStart(2, '0');
    const s = (totalSecs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (isLoading) return <div className="p-8 text-center text-telemetry">Loading Timeline...</div>;

  return (
    <div className="flex flex-col gap-6 max-w-[1920px] mx-auto h-[calc(100vh-100px)]">
      {/* HEADER / CONTROLS */}
      <div className="bg-surface-elevated border border-border rounded-lg p-4 flex flex-col gap-4 shadow-lg shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Activity className="text-telemetry w-6 h-6" />
            <div>
              <h2 className="text-text-primary font-bold uppercase tracking-widest text-lg">Mission Replay</h2>
              <p className="text-text-muted text-xs font-mono">{missionId} • Demo & Explainability Mode</p>
            </div>
          </div>
          <button onClick={onExit} className="px-4 py-2 bg-surface-secondary hover:bg-surface-elevated border border-border rounded text-text-primary text-sm font-bold tracking-wide uppercase">
            Exit Replay
          </button>
        </div>

        {/* Scrubber & Controls */}
        <div className="flex items-center gap-4 bg-background p-3 rounded border border-border">
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-10 h-10 bg-telemetry hover:bg-telemetry/80 text-background rounded-full flex items-center justify-center shrink-0 transition-colors"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
          </button>
          
          <button 
            onClick={() => { setElapsed(0); setIsPlaying(false); setIsFinished(false); }}
            className="w-8 h-8 bg-surface-secondary hover:bg-surface-elevated text-text-muted hover:text-text-primary border border-border rounded-full flex items-center justify-center shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="flex-1 flex flex-col gap-1">
            <div className="flex justify-between text-xs font-mono text-text-muted">
              <span>{formatTime(elapsed)}</span>
              <span className="text-telemetry font-bold">{currentEvent ? currentEvent.title : 'Ready'}</span>
              <span>{formatTime(totalDuration)}</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max={totalDuration} 
              value={elapsed} 
              onChange={handleSeek}
              className="w-full h-2 bg-surface-secondary rounded-lg appearance-none cursor-pointer accent-telemetry"
            />
          </div>
          
          <div className="flex items-center gap-1 bg-surface-secondary rounded p-1">
            {[1, 2, 5, 10].map(s => (
              <button 
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2 py-1 text-xs font-bold rounded ${speed === s ? 'bg-telemetry text-background shadow' : 'text-text-muted hover:text-text-primary'}`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {isFinished ? (
        <MissionScorecard missionId={missionId} dashboardData={dashboardData} events={events} />
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-hidden">
          
          {/* LEFT: TIMELINE */}
          <div className="lg:col-span-1 flex flex-col bg-surface-elevated border border-border rounded-lg overflow-hidden shadow">
            <div className="bg-surface-secondary border-b border-border p-3 flex justify-between items-center">
              <h3 className="font-bold text-sm tracking-widest uppercase text-text-primary">Event Log</h3>
              <Clock className="w-4 h-4 text-text-muted" />
            </div>
            <div className="flex-1 overflow-y-auto">
              <MissionEventTimeline events={events} currentTimestamp={currentTimestamp} />
            </div>
          </div>

          {/* MIDDLE: MAP & CHART */}
          <div className="lg:col-span-2 flex flex-col gap-6 overflow-hidden">
            <div className="flex-1 bg-surface-elevated border border-border rounded-lg relative overflow-hidden shadow">
              <div className="absolute top-2 left-2 z-[400] flex bg-background/80 backdrop-blur rounded border border-border p-1">
                <button onClick={() => setMapMode('2D')} className={`px-3 py-1 text-xs font-bold uppercase rounded ${mapMode === '2D' ? 'bg-telemetry text-background' : 'text-text-muted'}`}>2D</button>
                <button onClick={() => setMapMode('3D')} className={`px-3 py-1 text-xs font-bold uppercase rounded ${mapMode === '3D' ? 'bg-telemetry text-background' : 'text-text-muted'}`}>3D</button>
              </div>
              {mapMode === '2D' ? (
                <MissionMap 
                  missionId={missionId}
                  flightPath={slicedData.flight_path}
                  currentLocation={slicedData.current_location}
                  hotspots={slicedData.hotspots}
                  telemetry={slicedData.current_environment}
                  simulation={null} // Replay will inject simulated readings if event passed
                />
              ) : (
                <MissionMap3D 
                  missionId={missionId}
                  flightPath={slicedData.flight_path}
                  currentLocation={slicedData.current_location}
                  hotspots={slicedData.hotspots}
                  telemetry={slicedData.current_environment}
                  simulation={null}
                />
              )}
            </div>
            
            <div className="h-64 shrink-0 bg-surface-elevated border border-border rounded-lg shadow p-4">
              <PollutionTrendChart trend={slicedData.trend} mission={dashboardData.mission} />
            </div>
          </div>

          {/* RIGHT: INTELLIGENCE PANEL */}
          <div className="lg:col-span-1 flex flex-col gap-6 overflow-hidden">
            <ReplayIntelligence 
              currentEvent={currentEvent} 
              telemetry={slicedData.current_environment}
              activeEvents={activeEvents}
            />
          </div>
          
        </div>
      )}
    </div>
  );
}
