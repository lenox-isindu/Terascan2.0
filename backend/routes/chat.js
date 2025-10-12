import express from 'express';
import Groq from 'groq-sdk';

const router = express.Router();
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// POST /api/chat/message - Send message to AI
router.post('/message', async (req, res) => {
  try {
    const { message, soilData } = req.body;

    console.log('📨 Chat request received:', { 
      message: message?.substring(0, 100), 
      hasSoilData: !!soilData 
    });

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Build system prompt based on soil data
    let systemPrompt = `You are TerraScan AI, an agricultural expert. Be helpful, friendly, and provide practical farming advice.`;

    if (soilData) {
      systemPrompt += `\n\nUSER'S CURRENT SOIL ANALYSIS DATA (USE THIS FOR ALL RECOMMENDATIONS):
- Soil Health Score: ${soilData.healthScore}/100
- Risk Level: ${soilData.riskLevel}
- Vegetation Index (NDVI): ${soilData.ndvi}
- Soil Moisture: ${(soilData.moisture * 100).toFixed(1)}%
- Climate Zone: ${soilData.climateZone || 'Unknown'}
- Temperature: ${soilData.temperature || 'N/A'}°C
- Recommendations: ${Array.isArray(soilData.recommendations) ? soilData.recommendations.join(', ') : soilData.recommendations}

IMPORTANT: Always reference this soil data when giving advice about crops, soil improvements, or farming practices.`;
    }

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message.trim() }
      ],
      model: "llama-3.3-70b-versatile",
      max_tokens: 800,
      temperature: 0.7,
      stream: false
    });

    const reply = completion.choices[0].message.content;

    console.log('✅ Chat response generated:', reply.substring(0, 100) + '...');

    res.json({ 
      success: true,
      reply: reply,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Chat API error:', error);
    
    // Provide fallback response
    const fallbackResponse = "I'm having trouble connecting right now. Here's what I can tell you based on general farming knowledge: Focus on soil health through organic matter addition and proper water management.";
    
    res.json({
      success: false,
      reply: fallbackResponse,
      error: error.message
    });
  }
});

export default router;