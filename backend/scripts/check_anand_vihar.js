const mongoose = require('mongoose');
require('dotenv').config();
const Reading = require('./models/Reading');

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/qudracopterDB');
        
        // Count documents with location matching "Anand Vihar" (case insensitive)
        const count = await Reading.countDocuments({ location: { $regex: /Anand Vihar/i } });
        console.log(`Found ${count} readings for Anand Vihar.`);
        
        if (count > 0) {
            const sample = await Reading.findOne({ location: { $regex: /Anand Vihar/i } });
            console.log("Sample reading:");
            console.log(sample);
        }
        
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

check();
