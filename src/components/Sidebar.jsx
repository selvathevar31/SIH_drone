import React, { useState, useRef, useEffect } from 'react';
import { LayoutDashboard, Map, MapPin, Activity, History, Settings, UploadCloud, X, FileText, Database, GitCompare, Globe, PlayCircle } from 'lucide-react';
import { uploadCSV, loadDemoCSV } from '../services/api';

const navGroups = [
  {
    title: 'MISSION',
    items: [
      { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
      { id: 'explorer', icon: Database, label: 'Data Explorer' }
    ]
  },
  {
    title: 'ANALYTICS',
    items: [
      { id: 'history', icon: History, label: 'Flight History' },
      { id: 'comparison', icon: GitCompare, label: 'Comparison' },
      { id: 'mission_analytics', icon: Activity, label: 'Mission Analytics' }
    ]
  },
  {
    title: 'ACCESS',
    items: [
      { id: 'public', icon: Globe, label: 'Public Portal' },
      { id: 'settings', icon: Settings, label: 'Settings' }
    ]
  }
];

export default function Sidebar({ onUploadSuccess, currentView = 'overview', setCurrentView }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [file, setFile] = useState(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState(''); // '', 'uploading', 'processing', 'calculating', 'detecting'
  
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  
  const fileInputRef = useRef(null);

  // Helper to simulate smooth multi-stage loading UX
  const executeUploadWorkflow = async (uploadPromise) => {
    setIsUploading(true);
    setUploadError(null);
    setUploadStep('uploading');
    
    try {
      // Simulate quick stages since the backend processes it all synchronously
      setTimeout(() => setUploadStep('processing'), 500);
      setTimeout(() => setUploadStep('calculating'), 1000);
      setTimeout(() => setUploadStep('detecting'), 1500);
      
      const result = await uploadPromise();
      
      // Ensure we stay on the detecting step for at least a moment to show the progression
      setTimeout(() => {
        setUploadResult(result);
        if (onUploadSuccess) onUploadSuccess(result.mission_id, file?.name || '');
        setIsUploading(false);
        setUploadStep('');
      }, 2000);
      
    } catch (err) {
      setUploadError(err.message);
      setIsUploading(false);
      setUploadStep('');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadError(null);
      setUploadResult(null);
    }
  };

  const handleUpload = () => {
    if (!file) return;
    executeUploadWorkflow(() => uploadCSV(file));
  };

  const handleLoadDemo = () => {
    executeUploadWorkflow(() => loadDemoCSV());
  };

  const closeModal = () => {
    if (isUploading) return;
    setIsModalOpen(false);
    setFile(null);
    setUploadResult(null);
    setUploadError(null);
  };

  const getStepLabel = () => {
    switch(uploadStep) {
      case 'uploading': return 'Uploading CSV...';
      case 'processing': return 'Processing data...';
      case 'calculating': return 'Calculating AQI...';
      case 'detecting': return 'Detecting hotspots...';
      default: return 'Processing...';
    }
  };

  return (
    <>
      <aside className="w-16 lg:w-56 border-r border-border bg-surface-primary flex flex-col shrink-0 transition-all duration-300">
        <nav className="flex-1 py-6 px-3 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
          {navGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="flex flex-col gap-2">
              <span className="hidden lg:block px-3 text-[10px] font-mono font-bold tracking-widest uppercase text-text-muted">
                {group.title}
              </span>
              <div className="flex flex-col gap-1">
                {group.items.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <a
                      key={i}
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (item.id && setCurrentView) {
                          setCurrentView(item.id);
                        }
                      }}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors relative group ${
                        item.id === currentView 
                          ? 'bg-telemetry/5 text-text-primary font-medium' 
                          : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary/50'
                      }`}
                    >
                      {item.id === currentView && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-telemetry rounded-r-full" />
                      )}
                      <Icon className={`w-4 h-4 shrink-0 transition-colors ${item.id === currentView ? 'text-telemetry' : 'text-text-muted group-hover:text-text-primary'}`} />
                      <span className="hidden lg:block text-xs font-medium tracking-wide">{item.label}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        
        <div className="p-4 mb-4">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-telemetry hover:bg-telemetry/90 shadow-soft rounded-lg text-white text-xs font-bold tracking-wide uppercase transition-all"
          >
            <UploadCloud className="w-4 h-4 text-white" />
            <span className="hidden lg:block">Import CSV</span>
          </button>
        </div>
      </aside>

      {/* CSV Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-surface-primary border border-border rounded-lg shadow-2xl w-full max-w-md flex flex-col relative overflow-hidden">
            <div className="p-4 border-b border-border flex justify-between items-center bg-surface-elevated">
              <h3 className="font-bold text-text-primary tracking-wide uppercase">Import Mission Data</h3>
              <button onClick={closeModal} disabled={isUploading} className={`transition-colors ${isUploading ? 'text-border cursor-not-allowed' : 'text-text-muted hover:text-text-primary'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              {!uploadResult ? (
                <>
                  <div className="mb-4 text-sm text-text-secondary">
                    <p className="mb-2">Upload a CSV containing drone telemetry and environmental readings.</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <strong className="text-text-primary text-xs uppercase tracking-wide">Required:</strong>
                        <ul className="text-xs font-mono mt-1 space-y-1">
                          <li>timestamp</li><li>latitude</li><li>longitude</li>
                          <li>altitude</li><li>pm25</li><li>pm10</li>
                          <li>temperature</li><li>humidity</li>
                        </ul>
                      </div>
                      <div>
                        <strong className="text-text-primary text-xs uppercase tracking-wide">Optional:</strong>
                        <ul className="text-xs font-mono mt-1 space-y-1">
                          <li>speed</li><li>heading</li><li>battery</li>
                          <li>satellites</li><li>gps_status</li><li>signal_strength</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <input 
                      type="file" 
                      accept=".csv"
                      onChange={handleFileChange}
                      ref={fileInputRef}
                      disabled={isUploading}
                      className="block w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-surface-secondary file:text-text-primary hover:file:bg-surface-elevated file:transition-colors file:cursor-pointer border border-border rounded-md p-2 bg-background disabled:opacity-50"
                    />
                  </div>
                  
                  {uploadError && (
                    <div className="mb-4 p-3 bg-hazardous/10 border border-hazardous/30 text-hazardous rounded text-sm">
                      {uploadError}
                    </div>
                  )}

                  <div className="flex flex-col gap-3 mt-6">
                    <button
                      onClick={handleUpload}
                      disabled={!file || isUploading}
                      className="w-full py-2.5 bg-telemetry/10 hover:bg-telemetry/20 text-telemetry border border-telemetry/30 font-bold uppercase tracking-wide text-sm rounded transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                    >
                      {isUploading && uploadStep !== '' ? (
                        <><div className="w-4 h-4 border-2 border-telemetry border-t-transparent rounded-full animate-spin"></div> {getStepLabel()}</>
                      ) : 'Upload Data'}
                    </button>

                    <div className="relative flex items-center py-2">
                      <div className="flex-grow border-t border-border"></div>
                      <span className="flex-shrink-0 mx-4 text-text-muted text-xs uppercase tracking-widest">Or</span>
                      <div className="flex-grow border-t border-border"></div>
                    </div>

                    <button
                      onClick={handleLoadDemo}
                      disabled={isUploading}
                      className="w-full py-2.5 bg-surface-elevated hover:bg-surface-secondary text-text-primary border border-border font-bold uppercase tracking-wide text-sm rounded transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                    >
                      <FileText className="w-4 h-4" /> Load Demo CSV
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="w-12 h-12 rounded-full bg-safe/20 border border-safe/30 flex items-center justify-center mx-auto mb-4">
                    <UploadCloud className="w-6 h-6 text-safe" />
                  </div>
                  <h4 className="text-lg font-bold text-text-primary mb-2 uppercase tracking-widest">Import Complete</h4>
                  
                  <div className="bg-surface-secondary p-3 rounded border border-border mb-6 flex flex-col gap-2 text-left">
                    <div className="flex justify-between items-center pb-2 border-b border-border/50">
                      <span className="text-[10px] text-text-muted uppercase tracking-wider">Mission ID</span>
                      <span className="font-mono text-sm text-telemetry">{uploadResult.mission_id}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-border/50">
                      <span className="text-[10px] text-text-muted uppercase tracking-wider">Readings Processed</span>
                      <span className="font-mono text-sm text-text-primary">{uploadResult.rows_processed}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-text-muted uppercase tracking-wider">Hotspots Detected</span>
                      <span className="font-mono text-sm text-hazardous">{uploadResult.hotspots_detected}</span>
                    </div>
                  </div>
                  
                  <button onClick={closeModal} className="w-full py-2 bg-surface-elevated hover:bg-surface-secondary border border-border rounded font-bold uppercase tracking-wide text-sm text-text-primary">
                    View Dashboard
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
