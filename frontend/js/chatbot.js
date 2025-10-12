// chatbot.js - Secure version with backend API

class TerraScanChatbot {
  constructor() {
    this.currentAnalysis = null;
    this.conversationHistory = [];
    this.backendUrl = 'http://localhost:3000/api';
  }

  setCurrentAnalysis(analysis) {
    console.log("✅ Soil data received by chatbot:", analysis);
    this.currentAnalysis = analysis;
    
    if (analysis) {
      localStorage.setItem('terraScan_soilAnalysis', JSON.stringify(analysis));
    }
  }

  loadStoredAnalysis() {
    try {
      const stored = localStorage.getItem('terraScan_soilAnalysis');
      if (stored) {
        this.currentAnalysis = JSON.parse(stored);
        console.log("✅ Loaded stored soil data:", this.currentAnalysis);
      }
    } catch (e) {
      console.error("Error loading stored soil data:", e);
    }
  }

  async sendMessage(userMessage) {
    if (!userMessage.trim()) return "Please type a message.";

    if (!this.currentAnalysis) {
      this.loadStoredAnalysis();
    }

    console.log("📤 Sending message to backend:", { 
      message: userMessage.substring(0, 100),
      hasSoilData: !!this.currentAnalysis 
    });

    try {
      const response = await fetch(`${this.backendUrl}/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          soilData: this.currentAnalysis
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        return data.reply;
      } else {
        console.error('Backend error:', data.error);
        return this.getFallbackResponse(userMessage);
      }

    } catch (error) {
      console.error("Backend API error:", error);
      return this.getFallbackResponse(userMessage);
    }
  }

  getFallbackResponse(userMessage) {
    if (!this.currentAnalysis) {
      return "I'm having trouble connecting right now. Please try again in a moment or analyze a location first to get soil-specific advice.";
    }

    const soil = this.currentAnalysis;
    const message = userMessage.toLowerCase();

    if (message.includes('crop') || message.includes('grow') || message.includes('plant')) {
      return this.generateCropRecommendation(soil);
    }

    if (message.includes('soil') || message.includes('health') || message.includes('score')) {
      return this.generateSoilAnalysis(soil);
    }

    if (message.includes('moisture') || message.includes('water')) {
      return this.generateMoistureAdvice(soil);
    }

    if (message.includes('weather') || message.includes('temperature')) {
      return this.generateWeatherAdvice(soil);
    }

    return `I have your soil data (Score: ${soil.healthScore}/100, Risk: ${soil.riskLevel}). For detailed AI analysis, please try again in a moment. Meanwhile, consider ${soil.recommendations?.[0] || 'adding organic matter to improve soil health'}.`;
  }

  generateCropRecommendation(soil) {
    const score = soil.healthScore;
    let crops = [];
    let advice = "";

    if (score >= 70) {
      crops = ["Tomatoes 🍅", "Bell Peppers 🫑", "Lettuce 🥬", "Carrots 🥕", "Beans 🫘"];
      advice = "Hey buddy! Your soil is excellent! You can grow most crops successfully. Consider crop rotation to maintain fertility.";
    } else if (score >= 40) {
      crops = ["Potatoes 🥔", "Onions 🧅", "Cabbage 🥬", "Oats 🌾", "Peas 🫛"];
      advice = "Your soil is good but could use some love! Add organic matter and these crops will do great.";
    } else {
      crops = ["Cover Crops 🍀", "Legumes 🫘", "Root Vegetables 🥔", "Drought-tolerant plants 🌻"];
      advice = "Let's build up your soil first! Focus on soil improvement before planting cash crops. Start with cover crops.";
    }

    return `🌱 **Crop Recommendations**\n\nBased on your ${score}/100 soil health score:\n\n**Recommended:** ${crops.join(', ')}\n\n**Advice:** ${advice}\n\nYour soil has ${soil.riskLevel} risk level and ${(soil.moisture * 100).toFixed(1)}% moisture. Perfect timing for ${this.getSeasonalAdvice(soil.climateZone)}`;
  }

  generateSoilAnalysis(soil) {
    return `🔍 **Soil Health Report**\n\n**Score:** ${soil.healthScore}/100\n**Risk Level:** ${soil.riskLevel}\n**Vegetation:** ${soil.ndvi} NDVI\n**Moisture:** ${(soil.moisture * 100).toFixed(1)}%\n**Climate Zone:** ${soil.climateZone || 'Unknown'}\n\n**Recommendations:**\n${Array.isArray(soil.recommendations) ? soil.recommendations.map(rec => `• ${rec}`).join('\n') : soil.recommendations}`;
  }

  generateMoistureAdvice(soil) {
    const moisture = soil.moisture * 100;
    if (moisture < 30) {
      return `💧 **Low Soil Moisture (${moisture.toFixed(1)}%)**\n\nHey there! Your soil is quite dry. Consider:\n• Water conservation techniques\n• Mulching to reduce evaporation\n• Drought-resistant crop varieties\n• Irrigation if available\n\nPerfect time for water-wise farming!`;
    } else if (moisture > 70) {
      return `💧 **High Soil Moisture (${moisture.toFixed(1)}%)**\n\nYour soil has good moisture levels! Monitor for:\n• Proper drainage to prevent waterlogging\n• Root diseases in wet conditions\n• Adjust irrigation accordingly\n\nGreat for water-loving crops!`;
    } else {
      return `💧 **Good Soil Moisture (${moisture.toFixed(1)}%)**\n\nPerfect! Your soil moisture is in the ideal range. Maintain current practices and monitor regularly. Your plants will thank you!`;
    }
  }

  generateWeatherAdvice(soil) {
    const temp = soil.temperature;
    let clothing = "";
    let activity = "";

    if (temp > 30) {
      clothing = "👕 Light cotton clothes, wide-brimmed hat, and stay hydrated!";
      activity = "Early morning or late evening work is best";
    } else if (temp > 20) {
      clothing = "👕 Comfortable light layers - perfect farming weather!";
      activity = "Great conditions for all-day fieldwork";
    } else if (temp > 10) {
      clothing = "🧥 Light jacket and layers - comfortable for work";
      activity = "Good planting conditions";
    } else {
      clothing = "🧤 Warm layers, gloves, and hat needed";
      activity = "Consider greenhouse or indoor preparations";
    }

    return `🌤️ **Weather Tips**\n\n**Temperature:** ${temp}°C\n**Clothing:** ${clothing}\n**Activity:** ${activity}\n\n${this.getSeasonalAdvice(soil.climateZone)}`;
  }

  getSeasonalAdvice(climateZone) {
    const now = new Date();
    const month = now.getMonth();
    
    if (climateZone === 'tropical') {
      return "In tropical areas, you can plant year-round! Focus on water management during rainy seasons.";
    } else if (climateZone === 'temperate') {
      if (month >= 2 && month <= 5) return "Spring planting season! Perfect time for most crops.";
      if (month >= 6 && month <= 8) return "Summer growth period - monitor water and pests.";
      if (month >= 9 && month <= 11) return "Fall harvest time! Prepare for winter crops.";
      return "Winter - plan next season and maintain soil health.";
    } else {
      return "Good farming conditions! Monitor local weather patterns.";
    }
  }
}

// Initialize chatbot
const terraBot = new TerraScanChatbot();

// DOM functions
function addChatMessage(message, isUser = false) {
  const container = document.getElementById("chat-messages");
  if (!container) return;
  const msgDiv = document.createElement("div");
  msgDiv.className = `message ${isUser ? "user-message" : "bot-message"}`;
  msgDiv.innerHTML = message.replace(/\n/g, "<br>");
  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}

function showTypingIndicator() {
  const container = document.getElementById("chat-messages");
  if (!container) return;
  if (document.getElementById("typing-indicator")) return;
  const typingDiv = document.createElement("div");
  typingDiv.id = "typing-indicator";
  typingDiv.className = "message bot-message typing-indicator";
  typingDiv.innerHTML = "Analyzing... <span class='typing-dots'>•••</span>";
  container.appendChild(typingDiv);
  container.scrollTop = container.scrollHeight;
}

function hideTypingIndicator() {
  const el = document.getElementById("typing-indicator");
  if (el) el.remove();
}

async function askClaude() {
  const input = document.getElementById("chat-input");
  if (!input) return;
  const userMessage = input.value.trim();
  if (!userMessage) return;

  addChatMessage(userMessage, true);
  input.value = "";
  
  showTypingIndicator();

  try {
    const reply = await terraBot.sendMessage(userMessage);
    hideTypingIndicator();
    addChatMessage(reply, false);
  } catch (err) {
    hideTypingIndicator();
    console.error("Chat error:", err);
    addChatMessage("I'm having trouble right now. Please try again.", false);
  }
}

// AI Chat for Terra AI page
async function askAI() {
  const input = document.getElementById("ai-chat-input");
  const container = document.getElementById("ai-chat-messages");
  
  if (!input || !container) return;
  
  const userMessage = input.value.trim();
  if (!userMessage) return;

  // Add user message
  const userMsgDiv = document.createElement("div");
  userMsgDiv.className = "message user-message";
  userMsgDiv.textContent = userMessage;
  container.appendChild(userMsgDiv);
  
  input.value = "";
  container.scrollTop = container.scrollHeight;

  // Show typing indicator
  const typingDiv = document.createElement("div");
  typingDiv.className = "message bot-message typing-indicator";
  typingDiv.innerHTML = "Thinking... <span class='typing-dots'>•••</span>";
  container.appendChild(typingDiv);
  container.scrollTop = container.scrollHeight;

  try {
    const reply = await terraBot.sendMessage(userMessage);
    
    // Remove typing indicator
    typingDiv.remove();
    
    // Add bot response
    const botMsgDiv = document.createElement("div");
    botMsgDiv.className = "message bot-message";
    botMsgDiv.innerHTML = `<i class="fas fa-robot"></i> ${reply.replace(/\n/g, "<br>")}`;
    container.appendChild(botMsgDiv);
    container.scrollTop = container.scrollHeight;
    
  } catch (err) {
    typingDiv.remove();
    console.error("AI chat error:", err);
    
    const errorMsgDiv = document.createElement("div");
    errorMsgDiv.className = "message bot-message";
    errorMsgDiv.innerHTML = `<i class="fas fa-robot"></i> I'm having trouble connecting. Please try again in a moment.`;
    container.appendChild(errorMsgDiv);
    container.scrollTop = container.scrollHeight;
  }
}

// Enter key handlers
document.addEventListener("DOMContentLoaded", () => {
  const chatInput = document.getElementById("chat-input");
  const aiChatInput = document.getElementById("ai-chat-input");
  
  if (chatInput) {
    chatInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        askClaude();
      }
    });
  }
  
  if (aiChatInput) {
    aiChatInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        askAI();
      }
    });
  }
  
  // Load stored soil data
  terraBot.loadStoredAnalysis();
});

// Update chatbot with new analysis
function updateChatbotContext(analysis) {
  console.log("🔄 Updating chatbot with analysis:", analysis);
  terraBot.setCurrentAnalysis(analysis);
  
  // Show confirmation in both chat interfaces
  setTimeout(() => {
    const message = `🌱 **Soil Analysis Complete!**\n\nI now have your soil data:\n• Score: ${analysis.healthScore}/100\n• Risk: ${analysis.riskLevel}\n• Vegetation: ${analysis.ndvi}\n• Moisture: ${(analysis.moisture * 100).toFixed(1)}%\n\nAsk me about crops or soil improvements!`;
    
    // Update main chat
    const mainChat = document.getElementById("chat-messages");
    if (mainChat) {
      const msgDiv = document.createElement("div");
      msgDiv.className = "message bot-message";
      msgDiv.innerHTML = message.replace(/\n/g, "<br>");
      mainChat.appendChild(msgDiv);
      mainChat.scrollTop = mainChat.scrollHeight;
    }
    
    // Update AI chat
    const aiChat = document.getElementById("ai-chat-messages");
    if (aiChat) {
      const msgDiv = document.createElement("div");
      msgDiv.className = "message bot-message";
      msgDiv.innerHTML = `<i class="fas fa-robot"></i> ${message.replace(/\n/g, "<br>")}`;
      aiChat.appendChild(msgDiv);
      aiChat.scrollTop = aiChat.scrollHeight;
    }
  }, 500);
}

// Debug functions
function setSoilDataManually(analysis) {
  console.log("🔄 Manually setting soil data:", analysis);
  terraBot.setCurrentAnalysis(analysis);
  addChatMessage(`🌱 **Soil Data Loaded Manually!**\n\nScore: ${analysis.healthScore}/100\nRisk: ${analysis.riskLevel}\nAsk me about crops!`, false);
}

function debugChatbot() {
  console.log("=== CHATBOT DEBUG ===");
  console.log("Current analysis:", terraBot.currentAnalysis);
  console.log("Backend URL:", terraBot.backendUrl);
  return "Check console for debug info";
}