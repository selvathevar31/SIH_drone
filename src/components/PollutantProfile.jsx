import React, { useMemo } from 'react';

const PollutantProfile = ({ telemetryData }) => {
  const profile = useMemo(() => {
    if (!telemetryData || telemetryData.length === 0) return null;

    const sums = { pm25: 0, pm10: 0, no2: 0, so2: 0, co: 0, o3: 0 };
    const counts = { pm25: 0, pm10: 0, no2: 0, so2: 0, co: 0, o3: 0 };

    telemetryData.forEach(r => {
      ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3'].forEach(key => {
        if (r[key] !== null && r[key] !== undefined && r[key] !== '' && !Number.isNaN(Number(r[key]))) {
          sums[key] += Number(r[key]);
          counts[key] += 1;
        }
      });
    });

    const averages = {
      pm25: counts.pm25 > 0 ? sums.pm25 / counts.pm25 : null,
      pm10: counts.pm10 > 0 ? sums.pm10 / counts.pm10 : null,
      no2: counts.no2 > 0 ? sums.no2 / counts.no2 : null,
      so2: counts.so2 > 0 ? sums.so2 / counts.so2 : null,
      co: counts.co > 0 ? sums.co / counts.co : null,
      o3: counts.o3 > 0 ? sums.o3 / counts.o3 : null,
    };

    return averages;
  }, [telemetryData]);

  if (!profile) return null;

  const pollutants = [
    { key: 'pm25', label: 'PM2.5', color: '#EF5B32', unit: 'µg/m³', maxReference: 250 },
    { key: 'pm10', label: 'PM10', color: '#F4D03F', unit: 'µg/m³', maxReference: 430 },
    { key: 'no2', label: 'NO₂', color: '#2DBE72', unit: 'µg/m³', maxReference: 100 },
    { key: 'so2', label: 'SO₂', color: '#3B82F6', unit: 'µg/m³', maxReference: 50 },
    { key: 'co', label: 'CO', color: '#8B5CF6', unit: 'mg/m³', maxReference: 10 },
    { key: 'o3', label: 'O₃', color: '#06B6D4', unit: 'µg/m³', maxReference: 150 },
  ];

  return (
    <div className="bg-surface-primary border border-border rounded-[16px] p-6 shadow-card flex flex-col h-full">
      <div className="mb-6">
        <h3 className="text-text-primary font-bold tracking-widest uppercase text-sm mb-1">Pollutant Profile</h3>
        <p className="text-text-secondary text-xs">Current concentration levels</p>
      </div>

      <div className="flex-1 flex flex-col justify-between gap-4">
        {pollutants.map((p) => {
          const val = profile[p.key];
          const hasData = val !== null;
          // Calculate percentage width (cap at 100%)
          const pct = hasData ? Math.min((val / p.maxReference) * 100, 100) : 0;
          
          return (
            <div key={p.key} className="flex items-center gap-4">
              <div className="w-12 text-xs font-bold text-text-primary">{p.label}</div>
              
              <div className="flex-1 h-3 bg-surface-secondary rounded-full overflow-hidden flex items-center">
                {hasData && (
                  <div 
                    className="h-full rounded-full transition-all duration-1000 ease-out" 
                    style={{ width: `${pct}%`, backgroundColor: p.color }}
                  />
                )}
              </div>
              
              <div className="w-20 text-right">
                {hasData ? (
                  <div className="flex items-baseline justify-end gap-1">
                    <span className="text-sm font-mono font-bold text-text-primary">
                      {val < 10 ? val.toFixed(1) : Math.round(val)}
                    </span>
                    <span className="text-[10px] text-text-secondary">{p.unit}</span>
                  </div>
                ) : (
                  <span className="text-xs font-mono text-text-muted">N/A</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PollutantProfile;
