const mongoose = require('mongoose');
require('dotenv').config();
const Reading = require('./models/Reading');

async function test() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/qudracopterDB');
    const reading = await Reading.findOne({});
    console.log("MONGODB READING:");
    console.log(reading.toJSON());
    process.exit(0);
}
test();
