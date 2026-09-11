const mongoose = require('mongoose');
require('dotenv').config();

// Haversine formula to calculate distance between two lat/lng coordinates in km
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;  
    const dLon = (lon2 - lon1) * Math.PI / 180; 
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c; 
}

async function analyze() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const Reading = require('./models/Reading');
        
        const totalDocs = await Reading.countDocuments();
        const allDocs = await Reading.find({}).sort({ timestamp: 1 }).lean();
        
        if (allDocs.length === 0) {
            console.log("No readings found.");
            process.exit(0);
        }
        
        const earliest = allDocs[0].timestamp;
        const latest = allDocs[allDocs.length - 1].timestamp;
        const timeSpanMs = latest.getTime() - earliest.getTime();
        const timeSpanHours = timeSpanMs / (1000 * 60 * 60);
        
        // Sampling intervals
        let intervals = [];
        for (let i = 1; i < allDocs.length; i++) {
            const diff = allDocs[i].timestamp.getTime() - allDocs[i-1].timestamp.getTime();
            intervals.push(diff);
        }
        intervals.sort((a,b) => a-b);
        const medianInterval = intervals.length > 0 ? intervals[Math.floor(intervals.length/2)] : 0;
        
        // Unique locations
        const locations = new Set();
        let minLat = Infinity, maxLat = -Infinity;
        let minLng = Infinity, maxLng = -Infinity;
        
        let anandViharCount = 0;
        let avEarliest = null;
        let avLatest = null;
        
        const nullCounts = {
            timestamp: 0, latitude: 0, longitude: 0, altitude: 0,
            pm1: 0, pm25: 0, pm10: 0, temperature: 0, humidity: 0,
            speed: 0, heading: 0, battery: 0, satellites: 0,
            gps_status: 0, signal_strength: 0, aqi: 0, aqi_category: 0
        };
        
        for (const doc of allDocs) {
            // Location tracking
            if (doc.latitude != null && doc.longitude != null) {
                locations.add(`${doc.latitude},${doc.longitude}`);
                if (doc.latitude < minLat) minLat = doc.latitude;
                if (doc.latitude > maxLat) maxLat = doc.latitude;
                if (doc.longitude < minLng) minLng = doc.longitude;
                if (doc.longitude > maxLng) maxLng = doc.longitude;
                
                // Anand Vihar Check
                const dist = getDistance(28.6469, 77.3160, doc.latitude, doc.longitude);
                if (dist <= 2.0) { // 2 km radius
                    anandViharCount++;
                    if (!avEarliest || doc.timestamp < avEarliest) avEarliest = doc.timestamp;
                    if (!avLatest || doc.timestamp > avLatest) avLatest = doc.timestamp;
                }
            }
            
            // Null counts
            for (const key of Object.keys(nullCounts)) {
                if (doc[key] === null || doc[key] === undefined) {
                    nullCounts[key]++;
                }
            }
        }
        
        console.log("=== READINGS ANALYSIS ===");
        console.log(`1. Total documents: ${totalDocs}`);
        console.log(`2. Earliest timestamp: ${earliest.toISOString()}`);
        console.log(`3. Latest timestamp: ${latest.toISOString()}`);
        console.log(`4. Total time span (hours): ${timeSpanHours.toFixed(2)}`);
        console.log(`5. Sampling interval (median): ${medianInterval / 1000} seconds`);
        console.log(`6. Unique lat/lng locations: ${locations.size}`);
        console.log(`7. Bounding Box:`);
        console.log(`   - Min Latitude: ${minLat}`);
        console.log(`   - Max Latitude: ${maxLat}`);
        console.log(`   - Min Longitude: ${minLng}`);
        console.log(`   - Max Longitude: ${maxLng}`);
        
        console.log(`8. Readings inside Anand Vihar (radius 2km): ${anandViharCount}`);
        console.log(`9. Anand Vihar readings details:`);
        if (anandViharCount > 0) {
            console.log(`   - Earliest: ${avEarliest.toISOString()}`);
            console.log(`   - Latest: ${avLatest.toISOString()}`);
            console.log(`   - Count: ${anandViharCount}`);
        } else {
            console.log(`   - None`);
        }
        
        console.log(`10. Null/Missing Counts:`);
        for (const [key, val] of Object.entries(nullCounts)) {
            console.log(`   - ${key}: ${val}`);
        }
        
        console.log("\n=== Representative Documents (3 samples) ===");
        
        // Randomly select 3 samples, or take the first 3 if preferred.
        // Let's just take evenly spaced samples to give a good spread of the data.
        const sampleIndices = [0, Math.floor(allDocs.length / 2), allDocs.length - 1];
        const samples = sampleIndices.map(idx => allDocs[idx]);
        
        samples.forEach(s => {
            if (s) {
                delete s._id;
                delete s.__v;
            }
        });
        console.log(JSON.stringify(samples, null, 2));
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
analyze();
