import React, { useState, useMemo } from 'react';
import { Sparkles, MapPin, Wind, CloudRain, Thermometer, Clock, Globe, ArrowRight, ShieldCheck, BarChart2 } from 'lucide-react';
import MissionMap from './MissionMap';

const getAQIStatus = (aqi) => {
  if (aqi == null) return { text: 'N/A', color: 'text-text-muted', bg: 'bg-surface-secondary', border: 'border-border' };
  if (aqi <= 50) return { text: 'GOOD', color: 'text-safe', bg: 'bg-safe/10', border: 'border-safe/30' };
  if (aqi <= 100) return { text: 'MODERATE', color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/30' };
  if (aqi <= 150) return { text: 'UNHEALTHY (SENSITIVE)', color: 'text-hazardous', bg: 'bg-hazardous/10', border: 'border-hazardous/30' };
  return { text: 'UNHEALTHY', color: 'text-danger', bg: 'bg-danger/10', border: 'border-danger/30' };
};

export default function PublicDashboard({ missions, datasetStore, activeDatasetId, setActiveDatasetId, fetchAndStoreDataset }) {
  // Always ensure the active mission is loaded
  React.useEffect(() => {
    if (activeDatasetId && (!datasetStore || !datasetStore.has(activeDatasetId))) {
      const meta = missions.find(m => m.mission_id === activeDatasetId);
      if (meta && fetchAndStoreDataset) fetchAndStoreDataset(activeDatasetId, meta);
    }
  }, [activeDatasetId, datasetStore, fetchAndStoreDataset, missions]);

  const activeEntry = datasetStore?.get(activeDatasetId);
  const dashboardData = activeEntry?.dashboardData;
  const telemetryData = activeEntry?.telemetry || [];

  const aqiStatus = getAQIStatus(dashboardData?.current_environment?.aqi);

  // Compute stats across all loaded missions
  const globalStats = useMemo(() => {
    let totalDistance = 0;
    let totalSamples = 0;
    if (datasetStore) {
      datasetStore.forEach(entry => {
        totalDistance += (entry.dashboardData?.mission_stats?.distance_km || 0);
        totalSamples += (entry.telemetry?.length || 0);
      });
    }
    return {
      distance: totalDistance.toFixed(1),
      area: (totalDistance * 0.2).toFixed(2),
      samples: totalSamples
    };
  }, [datasetStore]);

  return (
    <div className="flex flex-col min-h-full bg-background w-full">
      {/* 1. Header */}
      <header className="flex justify-between items-center px-8 py-5 border-b border-border/50 bg-surface-primary sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Globe className="w-8 h-8 text-telemetry" />
          <span className="text-xl font-bold tracking-widest text-text-primary uppercase font-mono">QUADCOPTER</span>
        </div>
        
        <nav className="hidden md:flex gap-8 items-center text-sm font-bold tracking-wider text-text-secondary uppercase">
          <a href="#" className="hover:text-telemetry transition-colors text-text-primary">Home</a>
          <a href="#" className="hover:text-telemetry transition-colors">Live Air Quality</a>
          <a href="#" className="hover:text-telemetry transition-colors">Surveys</a>
          <a href="#" className="hover:text-telemetry transition-colors">About</a>
          <a href="#" className="hover:text-telemetry transition-colors">Our Mission</a>
        </nav>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-surface-secondary border border-border px-3 py-2 rounded">
            <MapPin className="w-4 h-4 text-text-muted" />
            <select
              value={activeDatasetId}
              onChange={e => setActiveDatasetId(e.target.value)}
              className="bg-transparent text-xs text-text-primary focus:outline-none cursor-pointer font-mono font-bold uppercase tracking-wider"
            >
              {missions.map(m => (
                <option key={m.mission_id} value={m.mission_id} className="bg-surface-elevated text-text-primary">
                  {activeEntry?.cityLabel || m.mission_id.substring(0,8)} ({new Date(m.date).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>
          <button className="bg-safe text-background px-6 py-2 rounded font-bold uppercase tracking-widest text-xs shadow-sm hover:opacity-90 transition-opacity flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-background animate-pulse"></span>
            Live Data
          </button>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative w-full h-[600px] flex items-center overflow-hidden border-b border-border">
        {/* Background Image overlayed with gradient */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1590500135870-07e3bd24caaa?q=80&w=2070&auto=format&fit=crop')" }}
        />
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-surface-primary/95 via-surface-primary/80 to-transparent" />
        
        <div className="relative z-20 w-full max-w-[1920px] mx-auto px-8 lg:px-16 flex flex-col lg:flex-row items-center justify-between gap-12">
          
          <div className="flex flex-col gap-6 max-w-xl">
            <div className="inline-flex items-center gap-2 bg-telemetry/10 border border-telemetry/30 text-telemetry px-3 py-1.5 rounded-full w-max text-[10px] font-bold uppercase tracking-widest">
              <Sparkles className="w-3 h-3" /> Drone-Powered Environmental Monitoring
            </div>
            <h1 className="text-5xl lg:text-7xl font-bold text-text-primary tracking-tight leading-tight">
              Real-time Air<br/>Quality Insights
            </h1>
            <p className="text-text-secondary text-lg leading-relaxed">
              Empowering communities with high-precision, drone-collected air quality data. Track pollution, visualize spatial distributions, and protect your environment.
            </p>
            <div className="flex gap-4 mt-4">
              <button className="bg-telemetry text-background px-8 py-3 rounded font-bold uppercase tracking-widest text-sm shadow-lg hover:shadow-telemetry/20 hover:-translate-y-0.5 transition-all flex items-center gap-2">
                View Live Map <ArrowRight className="w-4 h-4" />
              </button>
              <button className="bg-surface-secondary border border-border text-text-primary px-8 py-3 rounded font-bold uppercase tracking-widest text-sm hover:bg-surface-elevated transition-colors">
                Learn More
              </button>
            </div>
          </div>

          {/* Current Air Quality Card */}
          <div className="bg-surface-primary/90 backdrop-blur-md border border-border rounded-2xl p-8 shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-text-muted font-bold text-[10px] uppercase tracking-widest">Current Location</h3>
              <div className="flex items-center gap-1 text-safe text-[10px] font-bold uppercase tracking-widest bg-safe/10 px-2 py-1 rounded">
                <ShieldCheck className="w-3 h-3" /> Survey Active
              </div>
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-8 font-mono">{activeEntry?.cityLabel || 'Loading Location...'}</h2>
            
            <div className="flex justify-between items-end mb-8 border-b border-border/50 pb-8">
              <div className="flex flex-col">
                <span className="text-[10px] text-text-muted uppercase tracking-widest font-bold mb-2">Current AQI</span>
                <span className="text-6xl font-black text-text-primary tracking-tighter leading-none font-mono">
                  {dashboardData?.current_environment?.aqi || '--'}
                </span>
              </div>
              <div className={`px-4 py-2 rounded-lg border ${aqiStatus.bg} ${aqiStatus.border} ${aqiStatus.color} font-bold text-sm tracking-wider uppercase`}>
                {aqiStatus.text}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-muted uppercase tracking-widest font-bold flex items-center gap-1"><CloudRain className="w-3 h-3" /> PM2.5</span>
                <span className="text-xl font-bold text-text-primary font-mono">{dashboardData?.current_environment?.pm25?.toFixed(1) || '--'} <span className="text-[10px] text-text-muted">µg/m³</span></span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-muted uppercase tracking-widest font-bold flex items-center gap-1"><Wind className="w-3 h-3" /> PM10</span>
                <span className="text-xl font-bold text-text-primary font-mono">{dashboardData?.current_environment?.pm10?.toFixed(1) || '--'} <span className="text-[10px] text-text-muted">µg/m³</span></span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-text-muted font-mono uppercase">
              <Clock className="w-3 h-3" /> Last updated: {dashboardData?.mission?.end_time ? new Date(dashboardData.mission.end_time).toLocaleTimeString() : 'N/A'}
            </div>
          </div>
          
        </div>
      </section>

      {/* 3. Statistics Strip */}
      <section className="bg-surface-elevated border-b border-border py-8">
        <div className="max-w-[1920px] mx-auto px-8 lg:px-16 grid grid-cols-1 md:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-border">
          <div className="flex flex-col items-center justify-center text-center px-4">
            <span className="text-4xl font-black text-telemetry tracking-tighter mb-2 font-mono">{globalStats.samples}</span>
            <span className="text-[10px] text-text-muted uppercase tracking-widest font-bold">Samples Collected</span>
          </div>
          <div className="flex flex-col items-center justify-center text-center px-4">
            <span className="text-4xl font-black text-safe tracking-tighter mb-2 font-mono">{globalStats.area} km²</span>
            <span className="text-[10px] text-text-muted uppercase tracking-widest font-bold">Total Area Surveyed</span>
          </div>
          <div className="flex flex-col items-center justify-center text-center px-4">
            <span className="text-4xl font-black text-warning tracking-tighter mb-2 font-mono">100%</span>
            <span className="text-[10px] text-text-muted uppercase tracking-widest font-bold">Project Goal Completion</span>
          </div>
        </div>
      </section>

      {/* 4. Interactive Map View */}
      <section className="py-16 max-w-[1920px] mx-auto px-8 lg:px-16 w-full flex-grow">
        <div className="flex flex-col gap-2 mb-8">
          <h2 className="text-2xl font-bold text-text-primary uppercase tracking-widest flex items-center gap-2">
            <MapPin className="text-telemetry" /> Spatial Analysis
          </h2>
          <p className="text-text-secondary text-sm">Explore interactive drone-collected environmental data</p>
        </div>

        <div className="bg-surface-primary border border-border rounded-[16px] shadow-card h-[600px] overflow-hidden relative">
           <div className="absolute top-4 left-4 z-[1000] bg-surface-primary/90 backdrop-blur border border-border px-4 py-2 rounded flex items-center gap-3 shadow-lg pointer-events-none">
              <BarChart2 className="w-5 h-5 text-telemetry" />
              <div className="flex flex-col">
                <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Currently Viewing</span>
                <span className="text-xs font-bold text-text-primary font-mono">{activeDatasetId}</span>
              </div>
           </div>
           <MissionMap 
              missionId={activeDatasetId}
              flightPath={telemetryData}
              hotspots={dashboardData?.hotspots || []}
              telemetry={dashboardData?.current_environment || []}
              allDatasets={[]}
            />
        </div>
      </section>
      
    </div>
  );
}
