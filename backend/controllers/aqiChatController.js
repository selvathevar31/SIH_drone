const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
const { queryAiIntelligence } = require('../services/aiAnalytics');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);

const knowledgePath = path.join(__dirname, '../data/aqi_knowledge.txt');
let knowledgeContent = '';
try {
    knowledgeContent = fs.readFileSync(knowledgePath, 'utf8');
} catch (e) {
    console.error('Failed to load AQI knowledge base:', e);
}

exports.handleChat = async (req, res) => {
    try {
        const { message, mission_id } = req.body;
        console.log(`[FLUXX CHAT] Request received`);
        console.log(`[FLUXX CHAT] User message: ${message}`);

        if (!message) {
            return res.status(400).json({ error: "Message is required." });
        }

        if (message.trim().toLowerCase() === 'hi') {
            console.log(`[FLUXX CHAT] Sending response to Flutter`);
            return res.json({
                answer: "Hello. I'm the FLUXX Assistant. Ask me about AQI, pollutants, hotspots, missions, or air-quality data.",
                sources: [],
                dataUsed: false,
                ragUsed: false
            });
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-pro",
        });

        const classificationPrompt = `Classify the following user query: "${message}"

Does it need database telemetry data (needsDb)? Does it need general AQI/pollution knowledge (needsRag)?
Also extract:
- "location": The specific location name mentioned (e.g. "Anand Vihar", "Delhi"), or null if none.
- "metric": The primary metric asked about (e.g. "PM2.5", "AQI", "PM10", "temperature"), or null.
- "timeframe": Any specific time period or mission (e.g. "latest mission", "yesterday"), or null.
- "intent": The underlying intent. Options: "highest_aqi", "highest_pm25", "average_aqi", "hotspot_count", "cleanest_surveyed_area", "mission_summary", "pollution_trend", "pollution_by_altitude", "pollution_by_time_period", "unsupported".

Return ONLY a JSON object with these exact keys: "needsDb" (boolean), "needsRag" (boolean), "location" (string/null), "metric" (string/null), "timeframe" (string/null), "intent" (string/null). Do not include markdown formatting.`;
        
        const classifyResult = await model.generateContent(classificationPrompt);
        const textResponse = classifyResult.response.text().trim().replace(/```json/gi, '').replace(/```/g, '');
        const classification = JSON.parse(textResponse);
        
        let dataUsed = classification.needsDb;
        let ragUsed = classification.needsRag;
        let extracted = {
            location: classification.location,
            metric: classification.metric,
            timeframe: classification.timeframe,
            intent: classification.intent
        };
        console.log(`[FLUXX CHAT] Intent detected: ${extracted.intent || 'GENERAL'}`);
        let sources = [];
        
        let dbContext = '';
        if (dataUsed) {
            console.log(`[FLUXX CHAT] DB retrieval started`);
            const mId = mission_id || "M-001"; // fallback mission if none provided
            const dbInfo = await queryAiIntelligence(mId, message, extracted);
            dbContext = dbInfo.answer;
            if (dbInfo.data_source) {
                sources.push("FLUXX Database");
            }
            console.log(`[FLUXX CHAT] DB retrieval completed`);
        }
        
        let ragContext = '';
        if (ragUsed) {
            console.log(`[FLUXX CHAT] RAG retrieval started`);
            ragContext = knowledgeContent;
            sources.push("AQI Knowledge Base");
            console.log(`[FLUXX CHAT] RAG retrieval completed`);
        }
        
        // If the system couldn't figure it out, default to providing RAG
        if (!dataUsed && !ragUsed) {
            ragUsed = true;
            ragContext = knowledgeContent;
            sources.push("AQI Knowledge Base");
        }

        // Final generation
        const answerModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        
        const finalPrompt = `
You are the FLUXX AQI Assistant. Answer the user's question clearly and concisely.

User Question: ${message}

Here is the context retrieved to help you answer:
${dataUsed ? `Database Information:\n${dbContext}\n` : ''}
${ragUsed ? `General Knowledge:\n${ragContext}\n` : ''}

Rules:
- If Database Information is provided and it says no data is available or the intent is unsupported, state that clearly without guessing values.
- Explain the data using the General Knowledge if applicable.
- Do not invent or hallucinate metrics or facts.
- Keep the response mobile-friendly.
`;

        console.log(`[FLUXX CHAT] Gemini request started`);
        const answerResult = await answerModel.generateContent(finalPrompt);
        console.log(`[FLUXX CHAT] Gemini response received`);
        const answer = answerResult.response.text();
        
        console.log(`[FLUXX CHAT] Sending response to Flutter`);
        res.json({
            answer,
            sources,
            dataUsed,
            ragUsed
        });
    } catch (e) {
        console.error("AQI Chat Error:", e);
        res.status(500).json({ error: "Internal server error processing chat.", details: e.toString() });
    }
};
