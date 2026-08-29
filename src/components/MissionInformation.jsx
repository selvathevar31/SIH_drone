import React from 'react';

const InfoRow = ({ label, value }) => (
  <div className="flex justify-between items-start mb-3 pb-2 border-b border-border/30 last:mb-0 last:pb-0 last:border-0">
    <span className="text-xs text-text-muted mt-0.5">{label}</span>
    <span className="text-sm font-mono text-text-primary text-right break-all ml-4">{value}</span>
  </div>
);

const formatDuration = (seconds) => {
  if (seconds == null) return "N/A";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
};

export default function MissionInformation({ mission }) {
  if (!mission) return null;

  return (
    <div className="border border-border rounded-lg bg-surface-primary p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold tracking-wide text-text-primary uppercase">Mission Info</h2>
        <span className="text-[10px] px-2 py-0.5 rounded bg-surface-elevated border border-border font-mono text-text-secondary uppercase">
          {mission.data_source || 'UNKNOWN'}
        </span>
      </div>
      
      <div className="bg-surface-secondary rounded p-3 mb-4 flex items-center justify-between border border-border/50">
        <div className="text-[10px] text-text-muted uppercase tracking-wider">Drone ID</div>
        <div className="font-mono text-sm font-bold text-telemetry">{mission.drone_id || 'UNKNOWN'}</div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <InfoRow label="Mission ID" value={mission.mission_id} />
        <InfoRow label="Status" value={<span className={mission.status === 'IN_FLIGHT' ? 'text-safe animate-pulse' : 'text-text-primary'}>{mission.status}</span>} />
        <InfoRow label="Duration" value={formatDuration(mission.duration_seconds)} />
        <InfoRow label="Distance" value={mission.distance_km != null ? `${mission.distance_km.toFixed(2)} km` : 'N/A'} />
        <InfoRow label="Telemetry Speed" value={mission.average_telemetry_speed_mps != null ? `${mission.average_telemetry_speed_mps.toFixed(2)} m/s` : 'N/A'} />
        <InfoRow label="Ground Speed" value={mission.average_ground_speed_mps != null ? `${mission.average_ground_speed_mps.toFixed(2)} m/s` : 'N/A'} />
        <InfoRow label="Max Speed" value={mission.max_speed != null ? `${mission.max_speed.toFixed(2)} m/s` : 'N/A'} />
        <InfoRow label="Max Altitude" value={mission.max_altitude != null ? `${mission.max_altitude.toFixed(1)} m` : 'N/A'} />
        <InfoRow label="Data Points" value={mission.total_readings != null ? mission.total_readings : 'N/A'} />
        
        <div className="mt-4 pt-3 border-t border-border/50">
          <div className="flex flex-col gap-1 mb-3">
            <span className="text-[10px] text-text-muted uppercase tracking-wider">Start Location</span>
            <span className="font-mono text-[11px] text-text-secondary">
              {mission.start_latitude != null ? `${mission.start_latitude.toFixed(5)}, ${mission.start_longitude.toFixed(5)}` : 'N/A'}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-text-muted uppercase tracking-wider">Current Location</span>
            <span className="font-mono text-[11px] text-telemetry">
              {mission.current_latitude != null ? `${mission.current_latitude.toFixed(5)}, ${mission.current_longitude.toFixed(5)}` : 'N/A'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
