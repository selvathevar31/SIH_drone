const mongoose = require('mongoose');

mongoose.set('bufferCommands', false);

const connectDB = async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/qudracopterDB';
    try {
        const conn = await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 2500,
            connectTimeoutMS: 2500
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return conn;
    } catch (err) {
        console.warn(`MongoDB not connected (${err.message}). Backend will operate in resilient/demo mode.`);
        return null;
    }
};

module.exports = connectDB;