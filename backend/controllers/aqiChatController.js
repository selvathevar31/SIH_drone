const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { queryAiIntelligence } = require('../services/aiAnalytics');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);

const knowledgePath = path.join(__dirname, '../data/aqi_knowledge.txt');
let knowledgeContent = '';
try {
    knowledgeContent = fs.readFileSync(knowledgePath, 'utf8');
} catch (e) {
    console.error('Failed to load AQI knowledge base:', e);
}

function translateOfflineQuery(rawMessage) {
    const msg = rawMessage.toLowerCase().trim().replace(/['"?,]/g, '');
    
    let metrics = [];
    if (msg.match(/\b(aqi|air quality|air quality index)\b/)) metrics.push("AQI");
    if (msg.match(/\b(pm2\.5|pm25|pm 2\.5)\b/)) metrics.push("PM2.5");
    if (msg.match(/\b(pm10|pm 10)\b/)) metrics.push("PM10");
    if (msg.match(/\b(temperature|temp)\b/)) metrics.push("temperature");
    if (msg.match(/\b(humidity|humid)\b/)) metrics.push("humidity");
    
    if (metrics.length === 0 && msg.match(/\b(air|pollution)\b/)) {
        metrics = ["AQI", "PM2.5", "PM10"];
    }
    
    let operation = null;
    let location = null;
    let altitude = null;
    
    if (msg.match(/\b(hotspot|hotspots|high pollution areas|polluted areas)\b/)) {
        operation = "GET_HOTSPOTS";
    } else if (msg.match(/\b(mission summary|summarize mission|mission details|survey summary)\b/)) {
        operation = "MISSION_SUMMARY";
    } else if (msg.match(/\b(average|avg)\b/) || (msg.match(/\b(mean)\b/) && !msg.match(/\b(what does|what do)\b/))) {
        operation = "GET_AVERAGE";
    } else if (msg.match(/\b(minimum|min|lowest)\b/)) {
        operation = "GET_MIN";
    } else if (msg.match(/\b(maximum|max|highest)\b/)) {
        operation = "GET_MAX";
    } else if (msg.match(/\b(count|number of|how many)\b/)) {
        operation = "GET_COUNT";
    }
    
    const altMatch = msg.match(/\b(?:at |altitude )?(\d+)\s*(?:metres|meters|m|altitude)\b/);
    if (altMatch) {
        altitude = parseInt(altMatch[1], 10);
        if (!operation) operation = "GET_BY_ALTITUDE";
    }
    
    if (msg.match(/\b(anand vihar)\b/)) {
        location = "Anand Vihar";
        if (!operation) operation = "GET_BY_LOCATION";
    }
    
    if (!operation && (msg.match(/\b(latest|current|now|today|whats|whts|show)\b/) || msg.match(/\b(what is the|what are the)\b/))) {
        operation = "GET_LATEST";
    }
    
    if (operation && (metrics.length > 0 || ['GET_HOTSPOTS', 'MISSION_SUMMARY', 'GET_COUNT'].includes(operation))) {
        return {
            needsDb: true,
            needsRag: false,
            operation: operation,
            metrics: metrics,
            location: location,
            altitude: altitude,
            timeframe: null
        };
    }
    
    return null;
}

exports.handleChat = async (req, res) => {
    try {
        const { message, mission_id } = req.body;
        console.log(`\n--- RAG PIPELINE TRACE ---`);
        console.log(`[FLUXX QUERY]\nOriginal: ${message}`);

        if (!message) {
            return res.status(400).json({ error: "Message is required." });
        }

        const msgLower = message.trim().toLowerCase();
        if (msgLower === 'hi' || msgLower === 'hello') {
            console.log(`[RESPONSE]\nSent greeting bypass.\n--------------------------\n`);
            return res.json({
                answer: "Hello. I'm the FLUXX Assistant. Ask me about AQI, pollutants, hotspots, missions, or air-quality data.",
                sources: [],
                dataUsed: false,
                ragUsed: false
            });
        }

        // 1. OFFLINE TRANSLATION LAYER
        let classification = translateOfflineQuery(message);
        let dbAnswer = null;
        let dbContextStr = null;
        
        console.log(`[AI] Query received`);
        if (classification) {
             console.log(`[AI] Offline translation`);
             console.log(`[TRANSLATED]\nOperation: ${classification.operation}\nMetrics: ${classification.metrics.join(', ')}\nLocation: ${classification.location}\nAltitude: ${classification.altitude}`);
             
             const mId = mission_id || "M-001";
             console.log(`[DATABASE]\nOperation: ${classification.operation} on mission ${mId}`);
             
             const dbInfo = await queryAiIntelligence(mId, message, classification);
             
             console.log(`Records found: ${dbInfo.matching_rows || 0}`);
             
             if (dbInfo.has_data) {
                 console.log(`[AI] Database result found -> Gemini skipped`);
                 console.log(`[RESPONSE]\n${dbInfo.answer}`);
                 console.log(`--------------------------\n`);
                 return res.json({
                     answer: dbInfo.answer,
                     sources: ["FLUXX Database"],
                     dataUsed: true,
                     ragUsed: false
                 });
             } else {
                 console.log(`[AI] Database result empty -> Gemini fallback`);
                 dbAnswer = dbInfo.answer; // Store the "could not find..." text just in case Gemini fails
                 dbContextStr = `The offline database query found no matching data for this request. System internal note: "${dbInfo.answer}"`;
             }
        } else {
             console.log(`[TRANSLATED]\nCould not process offline. Falling back to Gemini RAG...`);
        }

        // 2. FALLBACK GEMINI LAYER
        try {
            const answerModel = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
            const finalPrompt = `
You are the FLUXX AQI Assistant. Provide a helpful, natural-language answer to the user's question.

User Question: ${message}

${dbContextStr ? `Database Context:\n${dbContextStr}\n` : ''}
General Knowledge:
${knowledgeContent}

Rules:
1. If Database Context says there is no data (e.g. for a specific pollutant like NO2, or a specific location), explain this clearly and friendly based on the Context, but ALSO see if you can provide general knowledge about what that pollutant or location typically implies. Do not just say "error".
2. Keep the response clear, concise, and mobile-friendly.
`;

            const answerResult = await answerModel.generateContent(finalPrompt);
            const answer = answerResult.response.text();
            
            console.log(`[AI] Gemini fallback response generated`);
            console.log(`[RESPONSE]\n${answer.substring(0, 100).replace(/\n/g, ' ')}...`);
            console.log(`--------------------------\n`);
            
            res.json({
                answer,
                sources: dbContextStr ? ["FLUXX Database", "AQI Knowledge Base"] : ["AQI Knowledge Base"],
                dataUsed: !!dbContextStr,
                ragUsed: true
            });
        } catch (geminiError) {
            console.error(`[AI] Gemini fallback failed:`, geminiError.message);
            console.log(`--------------------------\n`);
            
            if (dbAnswer) {
                // Return the deterministic offline text since Gemini crashed
                return res.json({
                    answer: dbAnswer,
                    sources: ["FLUXX Database"],
                    dataUsed: true,
                    ragUsed: false
                });
            } else {
                return res.json({
                    answer: "I'm currently unable to answer general questions due to server load. Please ask me about specific database measurements like AQI or PM2.5.",
                    sources: [],
                    dataUsed: false,
                    ragUsed: false
                });
            }
        }
    } catch (e) {
        console.error("AQI Chat Error:", e);
        res.status(500).json({ 
            error: "Internal server error processing chat.", 
            details: e.toString() 
        });
    }
};
