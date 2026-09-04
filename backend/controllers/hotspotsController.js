const Hotspot = require('../models/Hotspot');

exports.getHotspots = async (req, res) => {
    const hotspots = await Hotspot.find().sort({ detected_at: -1 });
    res.json(hotspots);
};
