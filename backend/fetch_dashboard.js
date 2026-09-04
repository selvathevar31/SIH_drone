const http = require('http');

http.get('http://localhost:8000/api/dashboard/M-1788548033344', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log("DASHBOARD DATA KEYS:", Object.keys(parsed));
      console.log("MISSION STATS:", parsed.mission_stats);
      console.log("FIRST TREND RECORD:", parsed.trend[0]);
      console.log("FIRST FLIGHT PATH RECORD:", parsed.flight_path[0]);
    } catch (e) {
      console.error(e);
    }
  });
}).on('error', (e) => {
  console.error("HTTP error:", e);
});
