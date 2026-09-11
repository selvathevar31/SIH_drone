const fs = require('fs');
const http = require('http');
const FormData = require('form-data');

const csvContent = `timestamp,latitude,longitude,pm2.5,pm10,temperature,humidity,mission_id
2026-09-12T10:00:00Z,28.6535,77.3165,150,200,25,60,M-TEST-123
2026-09-12T10:01:00Z,28.6536,77.3166,155,205,25.1,60.5,M-TEST-123`;

fs.writeFileSync('test_upload.csv', csvContent);

function uploadFile() {
    return new Promise((resolve, reject) => {
        const form = new FormData();
        form.append('file', fs.createReadStream('test_upload.csv'));

        const request = http.request({
            method: 'POST',
            host: '127.0.0.1',
            port: 8000,
            path: '/api/upload/csv',
            headers: form.getHeaders()
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({ status: res.statusCode, body: JSON.parse(data) });
            });
        });
        
        request.on('error', reject);
        form.pipe(request);
    });
}

async function runTests() {
    console.log("--- TEST 1: First Upload ---");
    const res1 = await uploadFile();
    console.log(`Status: ${res1.status}`);
    console.log(res1.body);
    
    console.log("\n--- TEST 2: Duplicate Upload ---");
    const res2 = await uploadFile();
    console.log(`Status: ${res2.status}`);
    console.log(res2.body);
}

runTests();
