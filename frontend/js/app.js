// app.js - SUPABASE-ONLY VERSION (No localStorage for history)
class TerascanApp {
    constructor() {
        this.currentPage = 'map-analysis';
        this.userLocation = null;
        this.analysisHistory = [];
        this.userId = this.getUserId();
        this.backendUrl = 'http://localhost:3000/api';
        this.terraAITimeout = null;
        
        this.init();
    }

    init() {
        this.setupNavigation();
        this.loadCommonQuestions();
        this.setupEventListeners();
        this.startLocationTracking();
        
        console.log('🚀 Terascan App Initialized - Supabase Only Mode');
    }

    // Core Methods
    getUserId() {
        let userId = localStorage.getItem('terraScan_userId');
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('terraScan_userId', userId);
        }
        return userId;
    }

    // Database Methods - SUPABASE ONLY
    async saveAnalysisToSupabase(analysis) {
        try {
            if (typeof supabase === 'undefined') {
                console.warn('Supabase not available');
                throw new Error('Supabase not available');
            }

            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                console.warn('No authenticated user:', userError);
                throw new Error('No authenticated user');
            }

            console.log('💾 Saving to Supabase for user:', user.id);

            const supabaseData = {
                user_id: user.id,
                lat: parseFloat(analysis.lat),
                lng: parseFloat(analysis.lng),
                location_name: analysis.locationName || "Unknown Location",
                health_score: parseInt(analysis.healthScore),
                risk_level: analysis.riskLevel,
                ndvi: parseFloat(analysis.ndvi),
                moisture: parseFloat(analysis.moisture),
                temperature: analysis.temperature ? parseFloat(analysis.temperature) : null,
                climate_zone: analysis.climateZone || 'unknown',
                recommendations: analysis.recommendations || [],
                created_at: new Date().toISOString()
            };

            console.log('📤 Inserting data to Supabase:', supabaseData);

            const { data, error } = await supabase
                .from('analysis_history')
                .insert([supabaseData])
                .select();

            if (error) {
                console.error('❌ Supabase error:', error);
                throw error;
            }

            console.log('✅ Saved to Supabase:', data);
            
            if (data && data.length > 0) {
                const newAnalysis = this.convertSupabaseToAppFormat(data[0], user.id);
                this.analysisHistory.unshift(newAnalysis);
            }
            
            return data;

        } catch (error) {
            console.error('💥 Failed to save to Supabase:', error);
            throw error;
        }
    }

    async loadAnalysisHistory() {
        const historyList = document.getElementById('history-list');
        if (!historyList) return;

        try {
            await this.loadHistoryFromSupabase();
            this.renderHistoryList(historyList);
        } catch (error) {
            console.error('Failed to load history:', error);
            this.showEmptyState(historyList);
        }
    }

    async loadHistoryFromSupabase() {
        if (typeof supabase === 'undefined') {
            throw new Error('Supabase not available');
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('No authenticated user');
        }

        console.log('📥 Loading from Supabase for user:', user.id);

        const { data, error } = await supabase
            .from('analysis_history')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        if (data && data.length > 0) {
            this.analysisHistory = data.map(item => 
                this.convertSupabaseToAppFormat(item, user.id)
            );
            console.log(`✅ Loaded ${this.analysisHistory.length} analyses from Supabase`);
        } else {
            this.analysisHistory = [];
            console.log('📭 No analyses found in Supabase');
        }
    }

    convertSupabaseToAppFormat(supabaseItem, userId) {
        return {
            id: supabaseItem.id,
            lat: parseFloat(supabaseItem.lat),
            lng: parseFloat(supabaseItem.lng),
            locationName: supabaseItem.location_name,
            healthScore: parseInt(supabaseItem.health_score),
            riskLevel: supabaseItem.risk_level,
            ndvi: parseFloat(supabaseItem.ndvi),
            moisture: parseFloat(supabaseItem.moisture),
            temperature: supabaseItem.temperature ? parseFloat(supabaseItem.temperature) : null,
            climateZone: supabaseItem.climate_zone,
            recommendations: supabaseItem.recommendations || [],
            timestamp: supabaseItem.created_at,
            userId: userId
        };
    }

    async addToHistory(analysisData) {
        console.log('💾 Adding to history (Supabase only):', analysisData);

        try {
            const supabaseResult = await this.saveAnalysisToSupabase(analysisData);
            
            if (supabaseResult) {
                this.showFlashCard('📊 Analysis saved to cloud!', 'success');
                
                if (this.currentPage === 'analysis-history') {
                    this.loadAnalysisHistory();
                }
                
                return supabaseResult;
            }
        } catch (error) {
            console.error('Failed to save analysis:', error);
            this.showFlashCard('❌ Failed to save analysis', 'error');
            throw error;
        }
    }

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    async deleteAnalysis(analysisId) {
        if (!confirm('Are you sure you want to delete this analysis?')) return;

        try {
            if (typeof supabase !== 'undefined') {
                const { error } = await supabase
                    .from('analysis_history')
                    .delete()
                    .eq('id', analysisId);

                if (error) throw error;
                console.log('✅ Deleted from Supabase:', analysisId);
            }

            this.analysisHistory = this.analysisHistory.filter(item => item.id !== analysisId);
            this.loadAnalysisHistory();
            this.showFlashCard('🗑️ Analysis deleted', 'info');
        } catch (error) {
            console.error('Delete error:', error);
            this.showFlashCard('❌ Delete failed', 'error');
        }
    }

    // UI Methods
    showPage(pageName) {
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));

        const targetPage = document.getElementById(pageName);
        if (targetPage) {
            targetPage.classList.add('active');
            const navItem = document.querySelector(`[data-page="${pageName}"]`);
            if (navItem) navItem.classList.add('active');

            this.currentPage = pageName;
            this.initializePage(pageName);
        }
    }

    initializePage(pageName) {
        switch(pageName) {
            case 'analysis-history':
                this.loadAnalysisHistory();
                break;
            case 'terra-ai':
                this.loadAIChat();
                break;
            case 'farm-insights':
                this.loadFarmInsights();
                break;
            case 'map-analysis':
                setTimeout(() => {
                    if (typeof initTerascanMap === 'function') initTerascanMap();
                }, 100);
                break;
        }
    }

    renderHistoryList(historyList) {
        if (this.analysisHistory.length === 0) {
            this.showEmptyState(historyList);
        } else {
            historyList.innerHTML = this.analysisHistory.map(analysis => `
                <div class="history-item" onclick="app.viewAnalysisDetails('${analysis.id}')">
                    <div class="history-main">
                        <div class="history-location">
                            <i class="fas fa-map-marker-alt"></i>
                            <strong>${analysis.locationName || 'Unknown Location'}</strong>
                        </div>
                        <div class="history-coordinates">
                            ${analysis.lat.toFixed(4)}, ${analysis.lng.toFixed(4)}
                        </div>
                        <div class="history-date">
                            <i class="fas fa-calendar"></i>
                            ${new Date(analysis.timestamp).toLocaleDateString()} • 
                            ${new Date(analysis.timestamp).toLocaleTimeString()}
                        </div>
                    </div>
                    <div class="history-stats">
                        <div class="score-display-mini">
                            <div class="score-circle-mini ${this.getScoreClass(analysis.healthScore)}">
                                ${analysis.healthScore}
                            </div>
                            <span class="score-label">Score</span>
                        </div>
                        <div class="history-metrics">
                            <div class="metric-tag">
                                <i class="fas fa-leaf"></i> NDVI: ${analysis.ndvi.toFixed(3)}
                            </div>
                            <div class="metric-tag">
                                <i class="fas fa-tint"></i> ${(analysis.moisture * 100).toFixed(1)}%
                            </div>
                        </div>
                    </div>
                    <div class="history-actions">
                        <button class="btn-sm btn-outline" onclick="event.stopPropagation(); app.reanalyzeLocation(${analysis.lat}, ${analysis.lng})">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                        <button class="btn-sm btn-danger" onclick="event.stopPropagation(); app.deleteAnalysis('${analysis.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        }
    }

    showEmptyState(historyList) {
        historyList.innerHTML = `
            <div class="history-placeholder">
                <i class="fas fa-history fa-3x"></i>
                <h3>No Analysis History</h3>
                <p>Your analyses are stored securely in the cloud. Analyze locations to see your history here.</p>
                <button class="btn-primary" onclick="app.showPage('map-analysis')">
                    <i class="fas fa-map"></i> Start Analyzing
                </button>
            </div>
        `;
    }

    viewAnalysisDetails(analysisId) {
        const analysis = this.analysisHistory.find(item => item.id === analysisId);
        if (analysis) {
            this.showAnalysisModal(analysis);
        }
    }

    showAnalysisModal(analysis) {
        const modalHtml = `
            <div class="modal" id="analysis-modal">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h3>Soil Analysis Details</h3>
                        <button class="modal-close" onclick="closeModal('analysis-modal')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="analysis-details">
                            <div class="detail-header">
                                <div class="location-info">
                                    <i class="fas fa-map-marker-alt"></i>
                                    <div>
                                        <h4>${analysis.locationName || 'Unknown Location'}</h4>
                                        <p>${analysis.lat.toFixed(4)}, ${analysis.lng.toFixed(4)}</p>
                                    </div>
                                </div>
                                <div class="detail-date">
                                    <i class="fas fa-calendar"></i>
                                    ${new Date(analysis.timestamp).toLocaleString()}
                                </div>
                            </div>
                            
                            <div class="detail-score">
                                <div class="score-circle-large ${this.getScoreClass(analysis.healthScore)}">
                                    ${analysis.healthScore}
                                </div>
                                <div class="score-info">
                                    <h4>Soil Health Score</h4>
                                    <span class="risk-badge risk-${analysis.riskLevel}">
                                        ${analysis.riskLevel.toUpperCase()} RISK
                                    </span>
                                </div>
                            </div>
                            
                            <div class="detail-metrics">
                                <h4>Soil Metrics</h4>
                                <div class="metrics-grid">
                                    <div class="metric-card">
                                        <div class="metric-icon">🌿</div>
                                        <div class="metric-info">
                                            <label>Vegetation Index (NDVI)</label>
                                            <div class="metric-value">${analysis.ndvi.toFixed(3)}</div>
                                            <div class="metric-status">${this.getNDVIStatus(analysis.ndvi)}</div>
                                        </div>
                                    </div>
                                    <div class="metric-card">
                                        <div class="metric-icon">💧</div>
                                        <div class="metric-info">
                                            <label>Soil Moisture</label>
                                            <div class="metric-value">${(analysis.moisture * 100).toFixed(1)}%</div>
                                            <div class="metric-status">${this.getMoistureStatus(analysis.moisture)}</div>
                                        </div>
                                    </div>
                                    ${analysis.temperature ? `
                                    <div class="metric-card">
                                        <div class="metric-icon">🌡️</div>
                                        <div class="metric-info">
                                            <label>Temperature</label>
                                            <div class="metric-value">${analysis.temperature}°C</div>
                                        </div>
                                    </div>
                                    ` : ''}
                                </div>
                            </div>
                            
                            <div class="detail-recommendations">
                                <h4>Recommendations</h4>
                                <ul>
                                    ${analysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" onclick="closeModal('analysis-modal')">
                            Close
                        </button>
                        <button class="btn-primary" onclick="app.reanalyzeLocation(${analysis.lat}, ${analysis.lng}); closeModal('analysis-modal')">
                            <i class="fas fa-sync-alt"></i> Re-analyze Location
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        const existingModal = document.getElementById('analysis-modal');
        if (existingModal) existingModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        document.getElementById('analysis-modal').classList.remove('hidden');
    }

    reanalyzeLocation(lat, lng) {
        this.showPage('map-analysis');
        
        setTimeout(() => {
            if (typeof window.addMarker === 'function') window.addMarker(lat, lng);
            if (typeof window.updateLocationDisplay === 'function') window.updateLocationDisplay(lat, lng);
            if (typeof analyzeLocation === 'function') analyzeLocation(lat, lng);
            
            this.showFlashCard('🔄 Re-analyzing location...', 'info');
        }, 1000);
    }

    // AI Chat Methods
    loadAIChat() {
        console.log('🤖 AI Chat page loaded');
        this.initializeAIChat();
        
        const chatMessages = document.getElementById('ai-chat-messages');
        if (chatMessages && chatMessages.children.length === 0) {
            this.addAIMessage(this.getWelcomeMessage(), 'bot');
        }
    }

    initializeAIChat() {
        console.log('🤖 Initializing AI chat interface...');
        
        const input = document.getElementById('ai-chat-input');
        const sendBtn = document.querySelector('#terra-ai .chat-send-btn');
        
        if (input && sendBtn) {
            sendBtn.addEventListener('click', () => {
                this.handleSendMessage();
            });
            
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleSendMessage();
                }
            });
        }
    }

    addAIMessage(message, sender = 'user') {
        const chatMessages = document.getElementById('ai-chat-messages');
        if (!chatMessages) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender === 'user' ? 'user-message' : 'bot-message'}`;
        
        if (sender === 'bot') {
            messageDiv.innerHTML = `
                <div class="message-avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="message-content">
                    <div class="message-text">${message.replace(/\n/g, '<br>')}</div>
                </div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="message-content">
                    <div class="message-text">${message}</div>
                </div>
                <div class="message-avatar">
                    <i class="fas fa-user"></i>
                </div>
            `;
        }
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async handleSendMessage() {
        const input = document.getElementById('ai-chat-input');
        const message = input?.value.trim();
        
        if (!message) return;
        
        if (input) input.value = '';
        await this.sendToAI(message);
    }

    async sendToAI(message) {
        console.log('🤖 Sending to AI:', message);
        
        this.addAIMessage(message, 'user');
        this.showAILoading();
        
        try {
            const soilData = this.analysisHistory.length > 0 ? this.analysisHistory[0] : null;

            console.log("📤 Sending message to backend:", { 
                message: message.substring(0, 100),
                hasSoilData: !!soilData 
            });

            const response = await fetch(`${this.backendUrl}/chat/message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    soilData: soilData
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            this.hideAILoading();
            
            if (data.success) {
                this.addAIMessage(data.reply, 'bot');
            } else {
                console.error('Backend error:', data.error);
                this.addAIMessage(this.getFallbackResponse(message, soilData), 'bot');
            }

        } catch (error) {
            console.error("Backend API error:", error);
            this.hideAILoading();
            this.addAIMessage(this.getFallbackResponse(message, this.analysisHistory[0]), 'bot');
        }
    }

    askCommonQuestion(question) {
        console.log('🤖 Asking common question:', question);
        this.showPage('terra-ai');
        
        if (this.terraAITimeout) {
            clearTimeout(this.terraAITimeout);
        }
        
        this.terraAITimeout = setTimeout(() => {
            this.sendToAI(question);
        }, 800);
    }

    showAILoading() {
        const chatMessages = document.getElementById('ai-chat-messages');
        if (!chatMessages) return;

        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message bot-message loading-message';
        loadingDiv.id = 'ai-loading-message';
        loadingDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="message-text">
                    <div class="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </div>
        `;
        
        chatMessages.appendChild(loadingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    hideAILoading() {
        const loadingMessage = document.getElementById('ai-loading-message');
        if (loadingMessage) {
            loadingMessage.remove();
        }
    }

    getFallbackResponse(userMessage, soilData) {
        if (!soilData) {
            return "I'm having trouble connecting right now. Please try again in a moment or analyze a location first to get soil-specific advice.";
        }

        const soil = soilData;
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

    getWelcomeMessage() {
        if (this.analysisHistory.length > 0) {
            return `👋 Welcome back! I see you have ${this.analysisHistory.length} soil analyses. I'm ready to help you with personalized farming advice based on your soil data! 

Ask me about:
• Plant recommendations for your soil type
• Water management strategies
• Soil improvement techniques
• Seasonal planting guidance
• Or anything else farming-related!`;
        } else {
            return `👋 Hello! I'm Terra AI, your soil health and farming assistant!

I can help you with:
• Plant selection and crop planning
• Soil health improvement strategies
• Water management and irrigation advice
• Pest and disease identification
• Sustainable farming practices

To get personalized advice, analyze your soil on the map page first! Then I can give you specific recommendations based on your actual soil conditions. 🌱`;
        }
    }

    // Common Questions
    loadCommonQuestions() {
        const questions = [
            {
                question: "What plants grow best in my area?",
                description: "Get personalized plant recommendations based on your soil and climate",
                category: "plants"
            },
            {
                question: "How can I improve my soil health score?",
                description: "Practical tips to boost your soil quality and fertility",
                category: "soil"
            },
            {
                question: "When is the best time to plant?",
                description: "Optimal planting schedules for your location",
                category: "timing"
            },
            {
                question: "What's causing low vegetation in my area?",
                description: "Identify and fix common vegetation issues",
                category: "vegetation"
            },
            {
                question: "How much water does my soil need?",
                description: "Smart irrigation and moisture management",
                category: "water"
            },
            {
                question: "What natural fertilizers work best?",
                description: "Organic solutions for soil enrichment",
                category: "fertilizers"
            }
        ];

        const questionsGrid = document.getElementById('common-questions');
        if (questionsGrid) {
            questionsGrid.innerHTML = questions.map(q => `
                <div class="question-card" onclick="app.askCommonQuestion('${q.question}')">
                    <h4>${q.question}</h4>
                    <p>${q.description}</p>
                    <div class="question-category">${q.category}</div>
                </div>
            `).join('');
        }

        const modalQuestions = document.getElementById('modal-questions');
        if (modalQuestions) {
            modalQuestions.innerHTML = questions.map(q => `
                <div class="question-card" onclick="app.askCommonQuestion('${q.question}'); closeModal('questions-modal')">
                    <h4>${q.question}</h4>
                    <p>${q.description}</p>
                    <div class="question-category">${q.category}</div>
                </div>
            `).join('');
        }
    }

    // Farm Insights
    loadFarmInsights() {
        const insightsGrid = document.getElementById('insights-grid');
        if (!insightsGrid) return;

        console.log('🌾 Loading smart farm insights...');

        if (this.analysisHistory.length === 0) {
            this.showEmptyInsights(insightsGrid);
            return;
        }

        const farmInsights = this.generateSmartInsights();
        this.renderSmartInsights(insightsGrid, farmInsights);
    }

    generateSmartInsights() {
        return {
            overallHealth: this.calculateAverageHealth(),
            problemAreas: this.identifyProblemAreas(),
            bestAreas: this.identifyBestAreas(),
            seasonalTrends: this.calculateSeasonalTrends(),
            actionPlan: this.generateActionPlan(),
            waterManagement: this.analyzeWaterNeeds(),
            soilImprovements: this.identifySoilImprovements()
        };
    }

    calculateAverageHealth() {
        if (this.analysisHistory.length === 0) return null;
        
        const avgScore = this.analysisHistory.reduce((sum, analysis) => 
            sum + analysis.healthScore, 0) / this.analysisHistory.length;
        
        const riskDistribution = this.analysisHistory.reduce((dist, analysis) => {
            dist[analysis.riskLevel] = (dist[analysis.riskLevel] || 0) + 1;
            return dist;
        }, {});

        const scoreTrend = this.calculateScoreTrend();

        return {
            averageScore: Math.round(avgScore),
            riskDistribution: riskDistribution,
            totalAnalyses: this.analysisHistory.length,
            scoreTrend: scoreTrend,
            overallStatus: avgScore >= 60 ? 'Good' : avgScore >= 40 ? 'Fair' : 'Needs Attention'
        };
    }

    calculateScoreTrend() {
        if (this.analysisHistory.length < 2) return 'stable';
        
        const recentScores = this.analysisHistory.slice(0, 3).map(a => a.healthScore);
        const olderScores = this.analysisHistory.slice(-3).map(a => a.healthScore);
        
        const recentAvg = recentScores.reduce((a, b) => a + b) / recentScores.length;
        const olderAvg = olderScores.reduce((a, b) => a + b) / olderScores.length;
        
        if (recentAvg > olderAvg + 5) return 'improving';
        if (recentAvg < olderAvg - 5) return 'declining';
        return 'stable';
    }

    identifyProblemAreas() {
        return this.analysisHistory
            .filter(analysis => analysis.healthScore < 50)
            .sort((a, b) => a.healthScore - b.healthScore)
            .slice(0, 5)
            .map(analysis => ({
                location: analysis.locationName || `Location ${analysis.lat.toFixed(2)}, ${analysis.lng.toFixed(2)}`,
                score: analysis.healthScore,
                riskLevel: analysis.riskLevel,
                mainIssues: this.identifySpecificIssues(analysis),
                priority: analysis.healthScore < 30 ? 'Critical' : 'High'
            }));
    }

    identifyBestAreas() {
        return this.analysisHistory
            .filter(analysis => analysis.healthScore >= 70)
            .sort((a, b) => b.healthScore - a.healthScore)
            .slice(0, 3)
            .map(analysis => ({
                location: analysis.locationName || `Location ${analysis.lat.toFixed(2)}, ${analysis.lng.toFixed(2)}`,
                score: analysis.healthScore,
                strengths: this.identifyStrengths(analysis),
                recommendation: "Maintain current practices - this area is thriving!"
            }));
    }

    identifySpecificIssues(analysis) {
        const issues = [];
        
        if (analysis.ndvi < 0.3) issues.push("Very low vegetation density");
        if (analysis.moisture < 0.3) issues.push("Extremely dry soil");
        if (analysis.healthScore < 30) issues.push("Critical soil health");
        if (analysis.ndvi >= 0.3 && analysis.ndvi < 0.5) issues.push("Moderate vegetation issues");
        
        return issues.length > 0 ? issues : ["General soil quality issues"];
    }

    identifyStrengths(analysis) {
        const strengths = [];
        
        if (analysis.ndvi >= 0.7) strengths.push("Excellent vegetation health");
        if (analysis.moisture >= 0.4 && analysis.moisture <= 0.7) strengths.push("Optimal moisture levels");
        if (analysis.healthScore >= 80) strengths.push("Outstanding soil quality");
        
        return strengths.length > 0 ? strengths : ["Good overall soil conditions"];
    }

    calculateSeasonalTrends() {
        if (this.analysisHistory.length < 3) {
            return { message: "Need more data for seasonal analysis" };
        }
        
        const monthlyAverages = {};
        this.analysisHistory.forEach(analysis => {
            const month = new Date(analysis.timestamp).getMonth();
            if (!monthlyAverages[month]) {
                monthlyAverages[month] = { totalScore: 0, count: 0 };
            }
            monthlyAverages[month].totalScore += analysis.healthScore;
            monthlyAverages[month].count++;
        });
        
        const trends = [];
        for (const [month, data] of Object.entries(monthlyAverages)) {
            const average = Math.round(data.totalScore / data.count);
            trends.push({
                month: this.getMonthName(parseInt(month)),
                averageScore: average,
                analysisCount: data.count
            });
        }
        
        return {
            monthlyTrends: trends.sort((a, b) => a.month - b.month),
            bestSeason: trends.reduce((best, current) => 
                current.averageScore > best.averageScore ? current : best
            ),
            worstSeason: trends.reduce((worst, current) => 
                current.averageScore < worst.averageScore ? current : worst
            )
        };
    }

    generateActionPlan() {
        const actions = [];
        const problemCount = this.analysisHistory.filter(a => a.healthScore < 50).length;
        const totalCount = this.analysisHistory.length;
        
        const dryAreas = this.analysisHistory.filter(a => a.moisture < 0.3);
        if (dryAreas.length > 0) {
            actions.push({
                type: "water",
                priority: dryAreas.length > totalCount * 0.3 ? "high" : "medium",
                message: `${dryAreas.length} of ${totalCount} areas need irrigation`,
                recommendation: "Implement drip irrigation in dry areas",
                areas: dryAreas.map(a => a.locationName || `Area at ${a.lat.toFixed(2)}, ${a.lng.toFixed(2)}`)
            });
        }
        
        if (problemCount > 0) {
            actions.push({
                type: "soil",
                priority: problemCount > totalCount * 0.5 ? "high" : "medium",
                message: `${problemCount} of ${totalCount} areas need soil improvement`,
                recommendation: "Add organic compost and consider cover crops",
                focusAreas: this.analysisHistory
                    .filter(a => a.healthScore < 50)
                    .map(a => a.locationName || `Area at ${a.lat.toFixed(2)}, ${a.lng.toFixed(2)}`)
            });
        }
        
        const lowVegAreas = this.analysisHistory.filter(a => a.ndvi < 0.3);
        if (lowVegAreas.length > 0) {
            actions.push({
                type: "vegetation",
                priority: "medium",
                message: `${lowVegAreas.length} areas have very low vegetation`,
                recommendation: "Consider reseeding or soil amendments",
                areas: lowVegAreas.map(a => a.locationName || `Area at ${a.lat.toFixed(2)}, ${a.lng.toFixed(2)}`)
            });
        }
        
        return actions;
    }

    analyzeWaterNeeds() {
        const moistureLevels = this.analysisHistory.map(a => a.moisture);
        const avgMoisture = moistureLevels.reduce((a, b) => a + b) / moistureLevels.length;
        
        const dryCount = this.analysisHistory.filter(a => a.moisture < 0.3).length;
        const optimalCount = this.analysisHistory.filter(a => a.moisture >= 0.3 && a.moisture <= 0.7).length;
        const wetCount = this.analysisHistory.filter(a => a.moisture > 0.7).length;
        
        return {
            averageMoisture: (avgMoisture * 100).toFixed(1) + '%',
            distribution: {
                dry: dryCount,
                optimal: optimalCount,
                wet: wetCount
            },
            recommendation: this.getWaterRecommendation(avgMoisture, dryCount, this.analysisHistory.length)
        };
    }

    getWaterRecommendation(avgMoisture, dryCount, totalCount) {
        if (dryCount > totalCount * 0.5) {
            return "Over 50% of your farm is dry. Consider installing irrigation system.";
        } else if (avgMoisture < 0.3) {
            return "Farm-wide moisture is low. Increase watering frequency.";
        } else if (avgMoisture > 0.7) {
            return "Farm is well-watered. Maintain current schedule.";
        } else {
            return "Good moisture balance. Continue current practices.";
        }
    }

    identifySoilImprovements() {
        const improvements = [];
        
        const lowOrganicAreas = this.analysisHistory.filter(a => a.healthScore < 40);
        if (lowOrganicAreas.length > 0) {
            improvements.push({
                type: "organic_matter",
                priority: "high",
                message: `${lowOrganicAreas.length} areas need organic matter`,
                action: "Add compost or manure to improve soil structure"
            });
        }
        
        const compactedAreas = this.analysisHistory.filter(a => 
            a.moisture > 0.7 && a.ndvi < 0.4
        );
        if (compactedAreas.length > 0) {
            improvements.push({
                type: "compaction",
                priority: "medium",
                message: `${compactedAreas.length} areas show signs of compaction`,
                action: "Consider aeration and avoid heavy machinery when wet"
            });
        }
        
        return improvements;
    }

    renderSmartInsights(insightsGrid, insights) {
        if (!insightsGrid) return;

        insightsGrid.innerHTML = `
            ${insights.overallHealth ? `
            <div class="insight-card insight-health">
                <div class="insight-header">
                    <i class="fas fa-heartbeat"></i>
                    <h3>Farm Health Overview</h3>
                </div>
                <div class="insight-content">
                    <div class="health-score-large">
                        <div class="score-circle-large ${this.getScoreClass(insights.overallHealth.averageScore)}">
                            ${insights.overallHealth.averageScore}
                        </div>
                        <div class="health-details">
                            <p><strong>Status:</strong> ${insights.overallHealth.overallStatus}</p>
                            <p><strong>Total Analyses:</strong> ${insights.overallHealth.totalAnalyses}</p>
                            <p><strong>Trend:</strong> ${insights.overallHealth.scoreTrend}</p>
                        </div>
                    </div>
                </div>
            </div>
            ` : ''}

            ${insights.problemAreas.length > 0 ? `
            <div class="insight-card insight-warning">
                <div class="insight-header">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Areas Needing Attention</h3>
                </div>
                <div class="insight-content">
                    ${insights.problemAreas.slice(0, 3).map(area => `
                        <div class="problem-area">
                            <div class="area-header">
                                <strong>${area.location}</strong>
                                <span class="priority-badge priority-${area.priority.toLowerCase()}">${area.priority}</span>
                            </div>
                            <div class="area-details">
                                <span class="score-mini ${this.getScoreClass(area.score)}">${area.score}</span>
                                <span class="risk-tag">${area.riskLevel} risk</span>
                            </div>
                            <ul class="area-issues">
                                ${area.mainIssues.map(issue => `<li>${issue}</li>`).join('')}
                            </ul>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            ${insights.actionPlan.length > 0 ? `
            <div class="insight-card insight-action">
                <div class="insight-header">
                    <i class="fas fa-tasks"></i>
                    <h3>Recommended Actions</h3>
                </div>
                <div class="insight-content">
                    ${insights.actionPlan.slice(0, 3).map(action => `
                        <div class="action-item">
                            <div class="action-type ${action.type}">
                                <i class="fas fa-${action.type === 'water' ? 'tint' : action.type === 'soil' ? 'seedling' : 'leaf'}"></i>
                            </div>
                            <div class="action-details">
                                <h4>${action.recommendation}</h4>
                                <p>${action.message}</p>
                                <div class="action-priority ${action.priority}">
                                    Priority: ${action.priority}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
        `;
    }

    showEmptyInsights(insightsGrid) {
        insightsGrid.innerHTML = `
            <div class="empty-insights">
                <div class="empty-icon">
                    <i class="fas fa-chart-bar fa-3x"></i>
                </div>
                <h3>No Farm Insights Yet</h3>
                <p>Analyze multiple locations on the map to unlock smart farm insights and recommendations.</p>
                <button class="btn-primary" onclick="app.showPage('map-analysis')">
                    <i class="fas fa-map-marker-alt"></i> Start Analyzing Locations
                </button>
            </div>
        `;
    }

    // Helper Methods
    getScoreClass(score) {
        if (score >= 70) return 'score-good';
        if (score >= 40) return 'score-medium';
        return 'score-poor';
    }

    getNDVIStatus(ndvi) {
        if (ndvi >= 0.7) return 'Excellent';
        if (ndvi >= 0.5) return 'Good';
        if (ndvi >= 0.3) return 'Fair';
        return 'Poor';
    }

    getMoistureStatus(moisture) {
        if (moisture >= 0.6) return 'High';
        if (moisture >= 0.4) return 'Adequate';
        if (moisture >= 0.2) return 'Low';
        return 'Very Low';
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

    getMonthName(month) {
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
        return months[month];
    }

    // Flash messages
    showFlashCard(message, type = 'info') {
        const flashCards = document.getElementById('flash-cards');
        if (!flashCards) return;

        const card = document.createElement('div');
        card.className = `flash-card ${type}`;
        card.innerHTML = `<div class="flash-content"><p>${message}</p></div>`;
        flashCards.appendChild(card);

        setTimeout(() => {
            if (card.parentNode) card.remove();
        }, 4000);
    }

    // Navigation & Event Listeners
    setupNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.showPage(item.getAttribute('data-page'));
            });
        });
    }

    setupEventListeners() {
        // Add any additional event listeners here
    }

    startLocationTracking() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    console.log('📍 Location:', this.userLocation);
                },
                (error) => {
                    console.log('Location denied');
                }
            );
        }
    }

    updateChatbotContext(analysis) {
        console.log('Updating chatbot with:', analysis);
    }
}

// Global app instance
let app;
document.addEventListener('DOMContentLoaded', function() {
    app = new TerascanApp();
    window.app = app;
});

// Global functions
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('open');
}

function showPage(pageName) {
    if (window.app) window.app.showPage(pageName);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
}