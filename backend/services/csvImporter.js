const csv = require('csv-parser');
const { Readable } = require('stream');
const { calculateAQI } = require('./aqi');

function processCsvUpload(fileContent, missionId, dataSource = "CSV") {
    return new Promise((resolve, reject) => {
        let fileContentStr;
        if (Buffer.isBuffer(fileContent)) {
            fileContentStr = fileContent.toString('utf-8');
        } else {
            fileContentStr = fileContent;
        }

        const stream = Readable.from(fileContentStr);
        
        const aliasMap = {
            'lat': 'latitude',
            'lon': 'longitude',
            'temp': 'temperature',
            'humid': 'humidity',
            'pm2.5': 'pm25',
            'pm 2.5': 'pm25',
            'pm 10': 'pm10',
            'pm1.0': 'pm1'
        };

        const results = [];
        let headersChecked = false;
        let missingCols = [];
        let missingColsErrorMsg = '';
        let totalRows = 0;
        let acceptedRows = 0;
        let rejectedRows = 0;
        const validReadings = [];
        const errors = [];
        const warnings = [];
        const originalHeaders = [];
        const mappedHeaders = [];

        stream
            .pipe(csv({
                mapHeaders: ({ header }) => {
                    originalHeaders.push(header);
                    const cleanCol = header.replace(/^\uFEFF/, '').toLowerCase().trim();
                    let mappedCol = cleanCol;
                    
                    if (/^pm\s*[\-_\.]?\s*2[\.\_]?5$/.test(cleanCol)) mappedCol = 'pm25';
                    else if (/^pm\s*[\-_\.]?\s*10(\.0)?$/.test(cleanCol)) mappedCol = 'pm10';
                    else if (/^pm\s*[\-_\.]?\s*1(\.0)?$/.test(cleanCol)) mappedCol = 'pm1';
                    else if (/^ozone/.test(cleanCol)) mappedCol = 'o3';
                    else if (/^so2/.test(cleanCol)) mappedCol = 'so2';
                    else if (/^co\b/.test(cleanCol)) mappedCol = 'co';
                    else if (/^no[x2]?\b/.test(cleanCol)) mappedCol = 'no2';
                    else if (aliasMap[cleanCol]) mappedCol = aliasMap[cleanCol];
                    else if (/^altitude/.test(cleanCol)) mappedCol = 'altitude';
                    else if (['timestamp', 'latitude', 'longitude', 'temperature', 'humidity', 'speed', 'heading', 'battery', 'satellites', 'gps_status', 'signal_strength', 'mission_id', 'mission', 'missionid'].includes(cleanCol)) {
                        mappedCol = (cleanCol === 'mission' || cleanCol === 'missionid') ? 'mission_id' : cleanCol;
                    }
                    
                    mappedHeaders.push(mappedCol);
                    return mappedCol;
                }
            }))
            .on('headers', (headers) => {
                console.log(`[CSV] Parsing started`);
                console.log(`[CSV PARSER] Original headers:`, originalHeaders);
                console.log(`[CSV PARSER] Mapped headers:`, headers);
                
                const requiredCols = ['timestamp', 'latitude', 'longitude'];
                missingCols = requiredCols.filter(col => !headers.includes(col));
                if (missingCols.length > 0) {
                    missingColsErrorMsg = `Missing required columns: ${missingCols.join(', ')}.`;
                    // Destroy stream to stop processing
                    stream.destroy();
                }
            })
            .on('data', (row) => {
                totalRows++;
                const rowNum = totalRows + 1; // 1-indexed plus header

                if (!row['timestamp'] || !row['latitude'] || !row['longitude']) {
                    errors.push({
                        row: rowNum,
                        field: "essential",
                        reason: "Missing one or more required spatial/temporal coordinates (timestamp, latitude, longitude)."
                    });
                    rejectedRows++;
                    return;
                }

                let timestampVal;
                try {
                    let tsStr = String(row['timestamp']).trim().replace('Z', '+00:00');
                    timestampVal = new Date(tsStr);
                    if (isNaN(timestampVal.getTime())) throw new Error("Invalid date");
                } catch (e) {
                    errors.push({
                        row: rowNum,
                        field: "timestamp",
                        reason: `Malformed timestamp '${row['timestamp']}'. Must be valid ISO 8601 datetime.`
                    });
                    rejectedRows++;
                    return;
                }

                const lat = parseFloat(row['latitude']);
                const lon = parseFloat(row['longitude']);

                if (isNaN(lat) || isNaN(lon)) {
                    errors.push({
                        row: rowNum,
                        field: "coordinates",
                        reason: "Latitude and longitude must be valid floating point values."
                    });
                    rejectedRows++;
                    return;
                }

                if (lat < -90.0 || lat > 90.0) {
                    errors.push({
                        row: rowNum,
                        field: "latitude",
                        reason: `Latitude ${lat} falls outside legal range [-90.0, 90.0].`
                    });
                    rejectedRows++;
                    return;
                }

                if (lon < -180.0 || lon > 180.0) {
                    errors.push({
                        row: rowNum,
                        field: "longitude",
                        reason: `Longitude ${lon} falls outside legal range [-180.0, 180.0].`
                    });
                    rejectedRows++;
                    return;
                }

                let pm1 = null, pm25 = null, pm10 = null, temp = null, humid = null, alt = null;
                let no2 = null, so2 = null, co = null, o3 = null;

                try {
                    if (row['pm1'] && row['pm1'].trim() !== '') {
                        const val = parseFloat(row['pm1']);
                        if (isNaN(val)) throw new Error("Invalid pm1");
                        if (val < 0) {
                            errors.push({ row: rowNum, field: "pm1", reason: `PM1.0 concentration ${val} µg/m³ cannot be negative.` });
                            rejectedRows++;
                            return;
                        }
                        pm1 = val;
                    }

                    if (row['pm25'] && row['pm25'].trim() !== '') {
                        const val = parseFloat(row['pm25']);
                        if (isNaN(val)) throw new Error("Invalid pm25");
                        if (val < 0) {
                            errors.push({ row: rowNum, field: "pm25", reason: `PM2.5 concentration ${val} µg/m³ cannot be negative.` });
                            rejectedRows++;
                            return;
                        }
                        pm25 = val;
                    }

                    if (row['pm10'] && row['pm10'].trim() !== '') {
                        const val = parseFloat(row['pm10']);
                        if (isNaN(val)) throw new Error("Invalid pm10");
                        if (val < 0) {
                            errors.push({ row: rowNum, field: "pm10", reason: `PM10 concentration ${val} µg/m³ cannot be negative.` });
                            rejectedRows++;
                            return;
                        }
                        pm10 = val;
                    }

                    const rowTemp = row['temperature'] || row['temperature_C'];
                    if (rowTemp && rowTemp.trim() !== '') {
                        const val = parseFloat(rowTemp);
                        if (isNaN(val)) throw new Error("Invalid temperature");
                        if (val < -50.0 || val > 100.0) {
                            errors.push({ row: rowNum, field: "temperature", reason: `Temperature ${val}°C falls outside range [-50, 100].` });
                            rejectedRows++;
                            return;
                        }
                        temp = val;
                    }

                    const rowHumid = row['humidity'] || row['humidity_pct'];
                    if (rowHumid && rowHumid.trim() !== '') {
                        const val = parseFloat(rowHumid);
                        if (isNaN(val)) throw new Error("Invalid humidity");
                        if (val < 0.0 || val > 100.0) {
                            errors.push({ row: rowNum, field: "humidity", reason: `Humidity ${val}% falls outside range [0, 100].` });
                            rejectedRows++;
                            return;
                        }
                        humid = val;
                    }

                    if (row['altitude'] && row['altitude'].trim() !== '') {
                        const val = parseFloat(row['altitude']);
                        if (!isNaN(val)) alt = val;
                    }
                    
                    ['no2', 'so2', 'co', 'o3'].forEach(gas => {
                        if (row[gas] && row[gas].trim() !== '') {
                            const val = parseFloat(row[gas]);
                            if (!isNaN(val) && val >= 0) {
                                if (gas === 'no2') no2 = val;
                                if (gas === 'so2') so2 = val;
                                if (gas === 'co') co = val;
                                if (gas === 'o3') o3 = val;
                            }
                        }
                    });

                } catch (ex) {
                    errors.push({ row: rowNum, field: "sensor", reason: `Sensor parameters failed type coercion: ${ex.message}` });
                    rejectedRows++;
                    return;
                }

                if (pm25 === null) warnings.push(`Row ${rowNum}: PM2.5 sensor telemetry is missing (stored as NULL).`);
                if (pm10 === null) warnings.push(`Row ${rowNum}: PM10 sensor telemetry is missing (stored as NULL).`);

                const { aqi, category } = calculateAQI({ pm25, pm10 });
                
                const finalMissionId = row['mission_id'] && row['mission_id'].trim() !== '' ? row['mission_id'].trim() : missionId;

                validReadings.push({
                    mission_id: finalMissionId,
                    data_source: dataSource,
                    timestamp: timestampVal,
                    latitude: lat,
                    longitude: lon,
                    altitude: alt,
                    altitude_reference: row['altitude_reference'] || "RELATIVE_HOME",
                    pm1: pm1,
                    pm25: pm25,
                    pm10: pm10,
                    no2: no2,
                    so2: so2,
                    co: co,
                    o3: o3,
                    temperature: temp,
                    humidity: humid,
                    speed: row['speed'] ? parseFloat(row['speed']) : null,
                    heading: row['heading'] ? parseFloat(row['heading']) : null,
                    battery: row['battery'] ? parseInt(row['battery'], 10) : null,
                    satellites: row['satellites'] ? parseInt(row['satellites'], 10) : null,
                    gps_status: row['gps_status'] || null,
                    signal_strength: row['signal_strength'] ? parseFloat(row['signal_strength']) : null,
                    aqi: aqi,
                    aqi_category: category
                });
                acceptedRows++;
            })
            .on('end', () => {
                console.log(`[CSV] Rows parsed: ${totalRows}`);
                console.log(`[CSV] Validation completed`);
                
                if (missingCols.length > 0) {
                    resolve({
                        success: false,
                        error: missingColsErrorMsg,
                        total_rows: totalRows,
                        accepted_rows: 0,
                        rejected_rows: totalRows,
                        rows_processed: 0,
                        rows_rejected: totalRows,
                        warnings: [],
                        errors: [{ row: 0, field: "columns", reason: `Missing columns: ${missingCols.join(', ')}` }]
                    });
                } else {
                    resolve({
                        success: acceptedRows > 0,
                        readings: validReadings,
                        total_rows: totalRows,
                        accepted_rows: acceptedRows,
                        rejected_rows: rejectedRows,
                        rows_processed: acceptedRows,
                        rows_rejected: rejectedRows,
                        warnings: warnings,
                        errors: errors
                    });
                }
            })
            .on('error', (e) => {
                resolve({
                    success: false,
                    error: `Failed to parse CSV: ${e.message}`,
                    total_rows: 0,
                    accepted_rows: 0,
                    rejected_rows: 0,
                    warnings: [],
                    errors: [{ row: 0, field: "file", reason: `Corrupt file layout: ${e.message}` }]
                });
            })
            .on('close', () => {
                if (missingCols.length > 0) {
                    resolve({
                        success: false,
                        error: missingColsErrorMsg,
                        total_rows: totalRows,
                        accepted_rows: 0,
                        rejected_rows: totalRows,
                        rows_processed: 0,
                        rows_rejected: totalRows,
                        warnings: [],
                        errors: [{ row: 0, field: "columns", reason: `Missing columns: ${missingCols.join(', ')}` }]
                    });
                }
            });
    });
}

module.exports = { processCsvUpload };
