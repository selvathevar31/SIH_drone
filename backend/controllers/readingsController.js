const dataStore = require('../services/dataStore');

exports.getReading = async (req, res) => {
    const reading = await dataStore.findReadingById(req.params.reading_id);
    if (!reading) {
        res.status(404);
        throw new Error("Reading not found");
    }
    res.json(reading);
};
