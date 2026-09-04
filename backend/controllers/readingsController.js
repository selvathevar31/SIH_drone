const Reading = require('../models/Reading');

exports.getReading = async (req, res) => {
    const reading = await Reading.findById(req.params.reading_id);
    if (!reading) {
        res.status(404);
        throw new Error("Reading not found");
    }
    res.json(reading);
};
