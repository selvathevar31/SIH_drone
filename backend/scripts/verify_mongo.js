const mongoose = require('mongoose');
require('dotenv').config();

async function verify() {
    try {
        console.log("Connecting to MongoDB...");
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`Connection successful!`);
        console.log(`Database name: ${conn.connection.name}`);
        
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log("Collections found:");
        collections.forEach(c => console.log(` - ${c.name}`));
        
        const Reading = require('./models/Reading');
        const count = await Reading.countDocuments();
        console.log(`readings document count: ${count}`);
        
        process.exit(0);
    } catch (error) {
        console.error("Error verifying MongoDB connection:", error);
        process.exit(1);
    }
}

verify();
