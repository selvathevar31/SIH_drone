const { queryAiIntelligence, getMissionInsights } = require('../services/aiAnalytics');

exports.queryIntelligence = async (req, res) => {
    const { question, mission_id } = req.body;
    const legacyRes = await queryAiIntelligence(mission_id, question);
    
    res.json({
        question,
        answer: legacyRes.answer,
        intent: legacyRes.query_type,
        confidence: 0.9,
        confidence_label: legacyRes.confidence,
        evidence: [],
        knowledge_sources: [],
        facts: [],
        inferences: [],
        recommendations: [],
        data_source: legacyRes.data_source,
        query_type: legacyRes.query_type,
        supporting_values: legacyRes.supporting_values,
        locations: legacyRes.locations
    });
};

exports.getInsights = async (req, res) => {
    const insights = await getMissionInsights(req.params.mission_id);
    res.json(insights);
};

exports.getKnowledgeDocuments = (req, res) => res.json([]);
exports.searchKnowledgeDocuments = (req, res) => res.json([]);
