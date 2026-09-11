const dataStore = require('../services/dataStore');

exports.getHotspots = async (req, res) => {
    const hotspots = await dataStore.findHotspots();
    res.json(hotspots);
};

exports.getPersistentHotspots = async (req, res) => {
    const hotspots = await dataStore.findHotspots();
    res.json({
        persistent_hotspots: hotspots || []
    });
};
