// app.js - Fixed User Data Association and Analysis History

class TerascanApp {
    constructor() {
        this.currentPage = 'map-analysis';
        this.currentLocation = null;
        this.userLocation = null;
        this.notifications = [];
        this.analysisHistory = [];
        this.backendUrl = 'http://localhost:3000/api';
        this.userName = 'User';
        this.userId = this.getUserId();
        
        this.init();
    }

    init() {
        this.setupNavigation();
        this.loadCommonQuestions();
        this.setupEventListeners();
        this.loadStoredData();
        this.startLocationTracking();
        
        console.log('🚀 Terascan App Initialized');
        
        setTimeout(() => {
            this.showWelcomeMessage();
        }, 1000);
    }

    getUserId() {
        let userId = localStorage.getItem('terraScan_userId');
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('terraScan_userId', userId);
        }
        return userId;
    }

    getUserStorageKey(key) {
        return `terraScan_${this.userId}_${key}`;
    }

    showWelcomeMessage() {
        const userName = this.getUserName();
        const locationInfo = this.userLocation ? 
            `at ${this.userLocation.lat.toFixed(4)}, ${this.userLocation.lng.toFixed(4)}` : 
            'in your area';
        
        const welcomeMessage = `👋 Hi ${userName}! Welcome back. I've analyzed conditions ${locationInfo}. Check Today's Tips for personalized recommendations!`;
        
        this.showFlashCard(welcomeMessage, 'success');
        
        if (this.userLocation) {
            setTimeout(() => {
                this.autoAnalyzeCurrentLocation();
            }, 2000);
        }
    }

    getUserName() {
        return localStorage.getItem('terraScan_userName') || 'User';
    }

    autoAnalyzeCurrentLocation() {
        if (!this.userLocation) return;
        
        console.log('🔄 Auto-analyzing current location...');
        
        setTimeout(() => {
            const mockAnalysis = this.generateMockAnalysis(this.userLocation);
            this.addToHistory(mockAnalysis);
            
            this.updateChatbotContext(mockAnalysis);
            this.updateSidebarTips(mockAnalysis);
            
            this.showFlashCard('✅ Auto-analysis complete! Check Today\'s Tips for recommendations.', 'info');
        }, 1500);
    }

    generateMockAnalysis(location) {
        const baseScore = Math.floor(Math.random() * 30) + 60;
        const temperature = this.getCurrentTemperature();
        
        return {
            id: Date.now(),
            lat: location.lat,
            lng: location.lng,
            locationName: "Your Current Location",
            healthScore: baseScore,
            riskLevel: baseScore >= 70 ? 'low' : baseScore >= 50 ? 'medium' : 'high',
            ndvi: (Math.random() * 0.5 + 0.3).toFixed(3),
            moisture: (Math.random() * 0.4 + 0.3).toFixed(2),
            temperature: temperature,
            climateZone: this.getClimateZone(location.lat),
            timestamp: new Date().toISOString(),
            recommendations: this.generateRecommendations(baseScore, temperature),
            userId: this.userId
        };
    }

    generateRecommendations(score, temperature) {
        const recommendations = [];
        
        if (score < 50) {
            recommendations.push("Add organic compost to improve soil structure");
            recommendations.push("Consider cover cropping to build soil health");
        }
        
        if (temperature > 30) {
            recommendations.push("Water plants early morning to reduce evaporation");
            recommendations.push("Apply mulch to retain soil moisture");
        }
        
        if (score >= 70) {
            recommendations.push("Maintain current practices - soil is in great condition");
            recommendations.push("Consider crop rotation to maintain fertility");
        }
        
        recommendations.push("Test soil pH and adjust if necessary");
        recommendations.push("Monitor soil moisture regularly");
        
        return recommendations.slice(0, 4);
    }

    updateSidebarTips(analysis) {
        const tipsContainer = document.getElementById('todays-tips-content');
        if (!tipsContainer) return;

        const tips = this.generateDynamicTips(analysis);
        
        tipsContainer.innerHTML = tips.map(tip => `
            <div class="tip-item ${tip.type}">
                <div class="tip-icon">${tip.icon}</div>
                <div class="tip-content">
                    <div class="tip-title">${tip.title}</div>
                    <div class="tip-description">${tip.description}</div>
                    ${tip.action ? `<div class="tip-action">${tip.action}</div>` : ''}
                </div>
            </div>
        `).join('');
    }

    generateDynamicTips(analysis) {
        const tips = [];
        const temp = analysis.temperature;
        const moisture = analysis.moisture;
        const score = analysis.healthScore;

        if (temp > 30) {
            tips.push({
                type: 'warning',
                icon: '🌡️',
                title: 'Hot Weather Alert',
                description: `Current temperature: ${temp}°C - quite warm for outdoor work`,
                action: 'Work early morning or late evening. Stay hydrated!'
            });
        } else if (temp > 20) {
            tips.push({
                type: 'success',
                icon: '🌤️',
                title: 'Perfect Conditions',
                description: `Current temperature: ${temp}°C - ideal conditions`,
                action: 'Great day for outdoor work and planting'
            });
        } else {
            tips.push({
                type: 'info',
                icon: '🧥',
                title: 'Cool Conditions',
                description: `Current temperature: ${temp}°C - wear appropriate layers`,
                action: 'Consider indoor preparations if too cold'
            });
        }

        const seasonalCrops = this.getSeasonalCrops();
        tips.push({
            type: 'success',
            icon: '🌱',
            title: 'Recommended Plants',
            description: `Best plants for current conditions`,
            action: `Consider: ${seasonalCrops.join(', ')}`
        });

        if (score >= 70) {
            tips.push({
                type: 'success',
                icon: '💪',
                title: 'Excellent Soil Health',
                description: `Your soil score is ${score}/100 - well done!`,
                action: 'Maintain current practices'
            });
        } else if (score >= 50) {
            tips.push({
                type: 'info',
                icon: '📊',
                title: 'Good Soil Health',
                description: `Your soil score is ${score}/100 - room for improvement`,
                action: 'Add organic matter to boost score'
            });
        } else {
            tips.push({
                type: 'warning',
                icon: '🚨',
                title: 'Soil Needs Attention',
                description: `Your soil score is ${score}/100 - needs improvement`,
                action: 'Focus on soil building practices'
            });
        }

        if (moisture < 0.3) {
            tips.push({
                type: 'warning',
                icon: '💧',
                title: 'Low Soil Moisture',
                description: `Moisture level: ${(moisture * 100).toFixed(1)}%`,
                action: 'Water plants and consider mulching'
            });
        } else if (moisture > 0.7) {
            tips.push({
                type: 'info',
                icon: '💧',
                title: 'Adequate Moisture',
                description: `Moisture level: ${(moisture * 100).toFixed(1)}%`,
                action: 'Reduce watering to prevent waterlogging'
            });
        }

        const activity = this.getDailyActivity();
        tips.push({
            type: 'info',
            icon: '🌿',
            title: "Today's Activity",
            description: activity.description,
            action: activity.action
        });

        return tips.slice(0, 5);
    }

    getSeasonalCrops() {
        const month = new Date().getMonth();
        const seasonalCrops = {
            0: ["Kale", "Spinach", "Broccoli"],
            1: ["Lettuce", "Peas", "Carrots"],
            2: ["Tomatoes", "Peppers", "Beans"],
            3: ["Corn", "Squash", "Cucumbers"],
            4: ["Beans", "Okra", "Sweet Potatoes"],
            5: ["Tomatoes", "Peppers", "Eggplant"],
            6: ["Carrots", "Beets", "Radishes"],
            7: ["Spinach", "Lettuce", "Kale"],
            8: ["Garlic", "Onions", "Shallots"],
            9: ["Cover Crops", "Winter Wheat"],
            10: ["Planning", "Soil Prep"],
            11: ["Greenhouse", "Herbs"]
        };
        
        return seasonalCrops[month] || ["Mixed Vegetables", "Herbs"];
    }

    getDailyActivity() {
        const hour = new Date().getHours();
        const activities = {
            morning: {
                description: "Perfect time for planting and light outdoor work",
                action: "Start with soil preparation and planting"
            },
            midday: {
                description: "Warmest part of the day - good for monitoring",
                action: "Check irrigation and plant health"
            },
            afternoon: {
                description: "Ideal for harvesting and maintenance",
                action: "Harvest ripe plants and weed beds"
            },
            evening: {
                description: "Cooling down - good for planning",
                action: "Plan tomorrow's tasks and record observations"
            }
        };

        if (hour >= 5 && hour < 11) return activities.morning;
        if (hour >= 11 && hour < 14) return activities.midday;
        if (hour >= 14 && hour < 18) return activities.afternoon;
        return activities.evening;
    }

    getClimateZone(lat) {
        if (lat > 35) return 'temperate';
        if (lat < -35) return 'temperate';
        if (Math.abs(lat) < 23.5) return 'tropical';
        return 'subtropical';
    }

    getCurrentTemperature() {
        const baseTemp = 25;
        const hour = new Date().getHours();
        if (hour >= 12 && hour <= 16) return 29;
        if (hour >= 6 && hour <= 10) return 22;
        return baseTemp;
    }

    setupNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.getAttribute('data-page');
                this.showPage(page);
                
                if (window.innerWidth <= 768) {
                    this.toggleSidebar();
                }
            });
        });

        document.addEventListener('click', (e) => {
            const sidebar = document.getElementById('sidebar');
            const toggleBtn = document.querySelector('.sidebar-toggle');
            
            if (window.innerWidth <= 768 && 
                sidebar.classList.contains('open') &&
                !sidebar.contains(e.target) &&
                !toggleBtn.contains(e.target)) {
                this.toggleSidebar();
            }
        });
    }

    showPage(pageName) {
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        const targetPage = document.getElementById(pageName);
        if (targetPage) {
            targetPage.classList.add('active');
            
            const navItem = document.querySelector(`[data-page="${pageName}"]`);
            if (navItem) {
                navItem.classList.add('active');
            }

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
                    if (typeof initTerascanMap === 'function') {
                        initTerascanMap();
                    }
                }, 100);
                break;
        }
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.querySelector('.main-content');
        
        if (sidebar && mainContent) {
            sidebar.classList.toggle('open');
            
            if (window.innerWidth > 768) {
                mainContent.style.marginLeft = sidebar.classList.contains('open') ? '300px' : '0';
            }
        }
    }

    startLocationTracking() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    };
                    this.updateLocationDisplay();
                    
                    console.log('📍 User location detected:', this.userLocation);
                    
                    setTimeout(() => {
                        this.autoAnalyzeCurrentLocation();
                    }, 2000);
                },
                (error) => {
                    console.log('Location access denied or unavailable:', error);
                    this.showFlashCard('📍 Enable location for automatic soil analysis, or click on the map to analyze manually.', 'info');
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        }
    }

    updateLocationDisplay() {
        const locationText = document.getElementById('location-text');
        if (this.userLocation && locationText) {
            locationText.textContent = `Location: ${this.userLocation.lat.toFixed(4)}, ${this.userLocation.lng.toFixed(4)}`;
        }
    }

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
                </div>
            `).join('');
        }

        const modalQuestions = document.getElementById('modal-questions');
        if (modalQuestions) {
            modalQuestions.innerHTML = questions.map(q => `
                <div class="question-card" onclick="app.askCommonQuestion('${q.question}'); closeModal('questions-modal')">
                    <h4>${q.question}</h4>
                    <p>${q.description}</p>
                </div>
            `).join('');
        }
    }

    askCommonQuestion(question) {
        this.showPage('terra-ai');
        
        setTimeout(() => {
            const input = document.getElementById('ai-chat-input');
            const sendBtn = document.querySelector('#terra-ai .chat-input button');
            
            if (input && sendBtn) {
                input.value = question;
                sendBtn.click();
            }
        }, 500);
    }

    askQuickQuestion(question) {
        this.showPage('terra-ai');
        
        setTimeout(() => {
            const input = document.getElementById('ai-chat-input');
            if (input) {
                input.value = question;
                askAI();
            }
        }, 500);
    }

    loadAnalysisHistory() {
        const historyList = document.getElementById('history-list');
        if (!historyList) return;

        const storageKey = this.getUserStorageKey('analysisHistory');
        const storedHistory = localStorage.getItem(storageKey);
        this.analysisHistory = storedHistory ? JSON.parse(storedHistory) : [];

        console.log(`📊 Loading history for user ${this.userId}:`, this.analysisHistory);

        if (this.analysisHistory.length === 0) {
            historyList.innerHTML = `
                <div class="history-placeholder">
                    <i class="fas fa-history fa-3x" style="color: var(--gray-light); margin-bottom: 1rem;"></i>
                    <h3>No Analysis History Yet</h3>
                    <p>Start by analyzing locations on the map to build your soil health history</p>
                    <button class="btn-primary" onclick="showPage('map-analysis')">
                        <i class="fas fa-map"></i> Start Analyzing
                    </button>
                </div>
            `;
        } else {
            historyList.innerHTML = this.analysisHistory.map(analysis => `
                <div class="history-item" onclick="app.viewAnalysisDetails(${analysis.id})">
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
                        <button class="btn-sm btn-danger" onclick="event.stopPropagation(); app.deleteAnalysis(${analysis.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        }
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
                                    ${analysis.climateZone ? `
                                    <div class="metric-card">
                                        <div class="metric-icon">🌍</div>
                                        <div class="metric-info">
                                            <label>Climate Zone</label>
                                            <div class="metric-value">${analysis.climateZone}</div>
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
        if (existingModal) {
            existingModal.remove();
        }
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        document.getElementById('analysis-modal').classList.remove('hidden');
    }

    reanalyzeLocation(lat, lng) {
        this.showPage('map-analysis');
        
        setTimeout(() => {
            if (typeof window.addMarker === 'function') {
                window.addMarker(lat, lng);
            }
            if (typeof window.updateLocationDisplay === 'function') {
                window.updateLocationDisplay(lat, lng);
            }
            if (typeof analyzeLocation === 'function') {
                analyzeLocation(lat, lng);
            }
            
            this.showFlashCard('🔄 Re-analyzing location...', 'info');
        }, 1000);
    }

    deleteAnalysis(analysisId) {
        if (confirm('Are you sure you want to delete this analysis?')) {
            this.analysisHistory = this.analysisHistory.filter(item => item.id !== analysisId);
            
            const storageKey = this.getUserStorageKey('analysisHistory');
            localStorage.setItem(storageKey, JSON.stringify(this.analysisHistory));
            
            this.loadAnalysisHistory();
            this.showFlashCard('🗑️ Analysis deleted from history', 'info');
        }
    }

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

    addToHistory(analysisData) {
        const historyItem = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            locationName: window.currentAnalysisLocation || "Selected Location",
            userId: this.userId,
            ...analysisData
        };

        this.analysisHistory.unshift(historyItem);
        
        if (this.analysisHistory.length > 50) {
            this.analysisHistory = this.analysisHistory.slice(0, 50);
        }

        const storageKey = this.getUserStorageKey('analysisHistory');
        localStorage.setItem(storageKey, JSON.stringify(this.analysisHistory));
        
        if (this.currentPage === 'analysis-history') {
            this.loadAnalysisHistory();
        }
        
        this.showFlashCard('📊 Analysis saved to history', 'info');
        
        console.log(`💾 Saved analysis to history for user ${this.userId}`, historyItem);
    }

    loadFarmInsights() {
        const insightsGrid = document.getElementById('insights-grid');
        if (!insightsGrid) return;

        console.log('🌾 Loading insights...');

        if (this.analysisHistory.length === 0) {
            insightsGrid.innerHTML = `
                <div class="insights-placeholder">
                    <i class="fas fa-seedling fa-3x" style="color: var(--gray-light); margin-bottom: 1rem;"></i>
                    <h3>No Insights Yet</h3>
                    <p>Analyze locations to get personalized recommendations and track your soil health progress</p>
                    <button class="btn-primary" onclick="showPage('map-analysis')">
                        <i class="fas fa-map"></i> Start Analyzing Soil
                    </button>
                </div>
            `;
            return;
        }

        const recentAnalysis = this.analysisHistory[0];
        const soilTrend = this.calculateSoilTrend();
        const seasonalAdvice = this.getSeasonalAdvice();

        insightsGrid.innerHTML = `
            <div class="insight-card insight-primary">
                <div class="insight-icon">📈</div>
                <h3>Soil Health Overview</h3>
                <div class="insight-metrics">
                    <div class="insight-metric">
                        <span class="metric-value">${recentAnalysis.healthScore}/100</span>
                        <span class="metric-label">Current Score</span>
                    </div>
                    <div class="insight-metric">
                        <span class="metric-value ${soilTrend.trend === 'improving' ? 'trend-up' : soilTrend.trend === 'declining' ? 'trend-down' : ''}">
                            ${soilTrend.trend === 'improving' ? '↗️' : soilTrend.trend === 'declining' ? '↘️' : '➡️'} ${Math.abs(soilTrend.change)}%
                        </span>
                        <span class="metric-label">${soilTrend.trend} trend</span>
                    </div>
                </div>
                <p>${this.getSoilHealthMessage(recentAnalysis.healthScore)}</p>
                <button class="btn-outline soil-health-btn" onclick="app.showSoilHealthDetails()">
                    View Soil Details
                </button>
            </div>

            <div class="insight-card">
                <div class="insight-icon">📅</div>
                <h3>Seasonal Planting Guide</h3>
                <div class="seasonal-content">
                    <div class="season-badge">${seasonalAdvice.season}</div>
                    <p class="season-tip">${seasonalAdvice.plantingTips}</p>
                    <div class="crop-suggestions">
                        <h4>Best Plants Right Now:</h4>
                        <div class="crop-tags">
                            ${seasonalAdvice.recommendedCrops.map(crop => `
                                <span class="crop-tag">${crop}</span>
                            `).join('')}
                        </div>
                    </div>
                    <div class="seasonal-tips">
                        <h4>This Season's Tips:</h4>
                        <ul>
                            ${seasonalAdvice.seasonTips.map(tip => `<li>${tip}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            </div>

            <div class="insight-card">
                <div class="insight-icon">💧</div>
                <h3>Water Management</h3>
                <div class="water-content">
                    <div class="moisture-level ${this.getMoistureLevelClass(recentAnalysis.moisture)}">
                        Soil Moisture: ${(recentAnalysis.moisture * 100).toFixed(1)}%
                    </div>
                    <p>${this.getWaterAdvice(recentAnalysis.moisture)}</p>
                    <div class="water-tips">
                        ${this.getWaterTips(recentAnalysis.moisture).map(tip => `
                            <div class="water-tip">💧 ${tip}</div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <div class="insight-card">
                <div class="insight-icon">🌤️</div>
                <h3>Field Conditions</h3>
                <div class="field-conditions">
                    <div class="condition-item">
                        <span class="condition-label">Temperature:</span>
                        <span class="condition-value">${recentAnalysis.temperature || this.getCurrentTemperature()}°C</span>
                    </div>
                    <div class="condition-item">
                        <span class="condition-label">Moisture:</span>
                        <span class="condition-value ${this.getMoistureLevelClass(recentAnalysis.moisture)}">
                            ${(recentAnalysis.moisture * 100).toFixed(1)}%
                        </span>
                    </div>
                    <div class="condition-item">
                        <span class="condition-label">Vegetation:</span>
                        <span class="condition-value ${this.getNDVIClass(recentAnalysis.ndvi)}">
                            ${this.getNDVIStatus(recentAnalysis.ndvi)}
                        </span>
                    </div>
                </div>
                <div class="field-notifications">
                    ${this.getFieldNotifications(recentAnalysis).map(notification => `
                        <div class="field-notification ${notification.type}">
                            <i class="fas ${notification.icon}"></i>
                            ${notification.message}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    showSoilHealthDetails() {
        if (this.analysisHistory.length === 0) return;

        const recentAnalysis = this.analysisHistory[0];
        
        const modalHtml = `
            <div class="modal" id="soil-health-modal">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h3>🌱 Soil Health Details</h3>
                        <button class="modal-close" onclick="closeModal('soil-health-modal')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="soil-details">
                            <div class="soil-score-large">
                                <div class="score-circle-large ${this.getScoreClass(recentAnalysis.healthScore)}">
                                    ${recentAnalysis.healthScore}
                                </div>
                                <div class="score-info">
                                    <h4>Overall Health Score</h4>
                                    <p>${this.getSoilHealthMessage(recentAnalysis.healthScore)}</p>
                                </div>
                            </div>
                            
                            <div class="soil-metrics">
                                <h4>Detailed Metrics</h4>
                                <div class="metric-detail">
                                    <span class="metric-name">Vegetation Index (NDVI)</span>
                                    <span class="metric-value">${recentAnalysis.ndvi.toFixed(3)}</span>
                                    <span class="metric-status ${this.getNDVIClass(recentAnalysis.ndvi)}">${this.getNDVIStatus(recentAnalysis.ndvi)}</span>
                                </div>
                                <div class="metric-detail">
                                    <span class="metric-name">Soil Moisture</span>
                                    <span class="metric-value">${(recentAnalysis.moisture * 100).toFixed(1)}%</span>
                                    <span class="metric-status ${this.getMoistureLevelClass(recentAnalysis.moisture)}">${this.getMoistureStatus(recentAnalysis.moisture)}</span>
                                </div>
                                <div class="metric-detail">
                                    <span class="metric-name">Risk Level</span>
                                    <span class="metric-value">${recentAnalysis.riskLevel}</span>
                                    <span class="metric-status risk-${recentAnalysis.riskLevel}">${recentAnalysis.riskLevel.toUpperCase()}</span>
                                </div>
                            </div>
                            
                            <div class="soil-recommendations">
                                <h4>Recommendations</h4>
                                <div class="recommendations-list">
                                    ${recentAnalysis.recommendations.map((rec, index) => `
                                        <div class="recommendation-item">
                                            <span class="rec-number">${index + 1}</span>
                                            <span class="rec-text">${rec}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-primary" onclick="closeModal('soil-health-modal')">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;

        const existingModal = document.getElementById('soil-health-modal');
        if (existingModal) existingModal.remove();

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        document.getElementById('soil-health-modal').classList.remove('hidden');
    }

    calculateSoilTrend() {
        if (this.analysisHistory.length < 2) {
            return { trend: 'stable', change: 0 };
        }
        
        const recentScore = this.analysisHistory[0].healthScore;
        const previousScore = this.analysisHistory[1].healthScore;
        const change = ((recentScore - previousScore) / previousScore) * 100;
        
        if (change > 5) return { trend: 'improving', change: change.toFixed(1) };
        if (change < -5) return { trend: 'declining', change: Math.abs(change).toFixed(1) };
        return { trend: 'stable', change: change.toFixed(1) };
    }

    getSoilHealthMessage(score) {
        if (score >= 70) return "Excellent soil health! Maintain your sustainable practices.";
        if (score >= 40) return "Good soil with improvement potential. Focus on organic matter.";
        return "Soil needs attention. Implement restoration practices immediately.";
    }

    getSeasonalAdvice() {
        const month = new Date().getMonth();
        const seasons = {
            0: { 
                season: "Late Summer", 
                plantingTips: "Perfect for harvesting and preparing autumn beds",
                recommendedCrops: ["Kale", "Spinach", "Lettuce", "Broccoli"],
                seasonTips: [
                    "Harvest summer crops before frost",
                    "Prepare soil for autumn planting",
                    "Add compost to empty beds"
                ]
            },
            1: { 
                season: "Early Autumn", 
                plantingTips: "Ideal for cool-season vegetables establishment",
                recommendedCrops: ["Broccoli", "Cauliflower", "Carrots", "Beets"],
                seasonTips: [
                    "Plant garlic and onions",
                    "Divide perennial herbs",
                    "Test soil pH levels"
                ]
            },
            2: { 
                season: "Mid Autumn", 
                plantingTips: "Last chance for winter crop planting",
                recommendedCrops: ["Garlic", "Onions", "Peas", "Broad Beans"],
                seasonTips: [
                    "Apply winter mulch",
                    "Protect tender plants",
                    "Clean and store tools"
                ]
            },
            7: { 
                season: "Early Spring", 
                plantingTips: "Perfect timing for most vegetable planting",
                recommendedCrops: ["Tomatoes", "Beans", "Maize", "Squash"],
                seasonTips: [
                    "Start seed indoors",
                    "Prepare garden beds",
                    "Test irrigation systems"
                ]
            },
            8: { 
                season: "Mid Spring", 
                plantingTips: "Warm-season crops planting window",
                recommendedCrops: ["Peppers", "Cucumbers", "Eggplant", "Melons"],
                seasonTips: [
                    "Direct sow warm crops",
                    "Stake tall plants",
                    "Monitor for pests"
                ]
            },
            11: { 
                season: "Mid Summer", 
                plantingTips: "Heat management and succession planting",
                recommendedCrops: ["Sweet Potatoes", "Okra", "Amaranth", "Malabar"],
                seasonTips: [
                    "Water deeply in morning",
                    "Harvest regularly",
                    "Watch for heat stress"
                ]
            }
        };
        
        return seasons[month] || { 
            season: "Growing Season", 
            plantingTips: "Good conditions for various plants",
            recommendedCrops: ["Mixed Vegetables", "Herbs", "Leafy Greens"],
            seasonTips: [
                "Monitor soil moisture",
                "Weed regularly",
                "Watch for pests"
            ]
        };
    }

    getWaterAdvice(moisture) {
        if (moisture < 0.3) return "🚨 Irrigation needed immediately - soil is very dry";
        if (moisture > 0.7) return "✅ Reduce watering - soil has adequate moisture";
        return "💧 Optimal moisture - maintain current watering schedule";
    }

    getWaterTips(moisture) {
        if (moisture < 0.3) {
            return [
                "Water early morning to reduce evaporation",
                "Use drip irrigation for efficiency",
                "Add mulch to retain soil moisture",
                "Check for leaks in irrigation"
            ];
        } else if (moisture > 0.7) {
            return [
                "Ensure proper drainage in fields",
                "Monitor for root diseases",
                "Reduce irrigation frequency",
                "Improve soil aeration"
            ];
        } else {
            return [
                "Maintain consistent watering",
                "Monitor soil moisture weekly",
                "Consider rainwater harvesting",
                "Use moisture sensors"
            ];
        }
    }

    getFieldNotifications(analysis) {
        const notifications = [];
        const temperature = analysis.temperature || this.getCurrentTemperature();

        if (temperature > 35) {
            notifications.push({
                type: 'danger',
                icon: 'fa-temperature-high',
                message: 'Extreme heat! Limit outdoor work to morning hours'
            });
        } else if (temperature > 30) {
            notifications.push({
                type: 'warning',
                icon: 'fa-sun',
                message: 'Hot day - stay hydrated and take breaks'
            });
        } else if (temperature > 20) {
            notifications.push({
                type: 'success',
                icon: 'fa-check-circle',
                message: 'Perfect temperature for outdoor work'
            });
        } else if (temperature < 10) {
            notifications.push({
                type: 'warning',
                icon: 'fa-temperature-low',
                message: 'Cold conditions - wear warm layers'
            });
        }

        if (analysis.moisture < 0.3) {
            notifications.push({
                type: 'danger',
                icon: 'fa-tint',
                message: 'Critical: Soil needs immediate watering'
            });
        } else if (analysis.moisture > 0.7) {
            notifications.push({
                type: 'warning',
                icon: 'fa-tint',
                message: 'High moisture - check drainage'
            });
        }

        if (analysis.ndvi < 0.3) {
            notifications.push({
                type: 'warning',
                icon: 'fa-leaf',
                message: 'Low vegetation - consider soil amendments'
            });
        } else if (analysis.ndvi >= 0.7) {
            notifications.push({
                type: 'success',
                icon: 'fa-leaf',
                message: 'Excellent plant growth detected'
            });
        }

        return notifications.slice(0, 3);
    }

    getMoistureLevelClass(moisture) {
        if (moisture >= 0.6) return 'moisture-high';
        if (moisture >= 0.4) return 'moisture-adequate';
        if (moisture >= 0.2) return 'moisture-low';
        return 'moisture-very-low';
    }

    getNDVIClass(ndvi) {
        if (ndvi >= 0.7) return 'ndvi-excellent';
        if (ndvi >= 0.5) return 'ndvi-good';
        if (ndvi >= 0.3) return 'ndvi-fair';
        return 'ndvi-poor';
    }

    loadAIChat() {
        console.log('AI Chat page loaded');
        if (typeof initializeTerraAIChat === 'function') {
            setTimeout(initializeTerraAIChat, 100);
        }
    }

    updateChatbotContext(analysis) {
        console.log('🔄 Updating chatbot context with analysis:', analysis);
        
        const storageKey = this.getUserStorageKey('soilAnalysis');
        localStorage.setItem(storageKey, JSON.stringify(analysis));
        
        if (typeof terraBot !== 'undefined' && terraBot.setCurrentAnalysis) {
            terraBot.setCurrentAnalysis(analysis);
        }
        
        this.showAnalysisCompletionMessage(analysis);
    }

    showAnalysisCompletionMessage(analysis) {
        const message = `🌱 **Soil Analysis Complete!**\n\nI now have your soil data:\n• Score: ${analysis.healthScore}/100\n• Risk: ${analysis.riskLevel}\n• Vegetation: ${analysis.ndvi}\n• Moisture: ${(analysis.moisture * 100).toFixed(1)}%\n\nAsk me about plants or soil improvements!`;

        const mainChat = document.getElementById("chat-messages");
        if (mainChat) {
            const msgDiv = document.createElement("div");
            msgDiv.className = "message bot-message";
            msgDiv.innerHTML = message.replace(/\n/g, "<br>");
            mainChat.appendChild(msgDiv);
            mainChat.scrollTop = mainChat.scrollHeight;
        }
        
        const aiChat = document.getElementById("ai-chat-messages");
        if (aiChat) {
            const msgDiv = document.createElement("div");
            msgDiv.className = "message bot-message";
            msgDiv.innerHTML = `<i class="fas fa-robot"></i> ${message.replace(/\n/g, "<br>")}`;
            aiChat.appendChild(msgDiv);
            aiChat.scrollTop = aiChat.scrollHeight;
        }
    }

    showFlashCard(message, type = 'info') {
        const flashCards = document.getElementById('flash-cards');
        if (!flashCards) return;

        const card = document.createElement('div');
        card.className = `flash-card ${type}`;
        card.innerHTML = `
            <div class="flash-content">
                <p>${message}</p>
            </div>
        `;

        flashCards.appendChild(card);

        setTimeout(() => {
            if (card.parentNode) {
                card.style.animation = 'slideInRight 0.3s ease reverse';
                setTimeout(() => card.remove(), 300);
            }
        }, 8000);
    }

    loadStoredData() {
        const historyKey = this.getUserStorageKey('analysisHistory');
        const storedHistory = localStorage.getItem(historyKey);
        
        if (storedHistory) {
            this.analysisHistory = JSON.parse(storedHistory);
            console.log(`📊 Loaded ${this.analysisHistory.length} historical analyses for user ${this.userId}`);
            
            if (this.analysisHistory.length > 0) {
                this.updateSidebarTips(this.analysisHistory[0]);
            }
        }

        const preferencesKey = this.getUserStorageKey('preferences');
        const preferences = localStorage.getItem(preferencesKey);
        if (preferences) {
            this.preferences = JSON.parse(preferences);
        }
    }

    savePreferences() {
        const storageKey = this.getUserStorageKey('preferences');
        localStorage.setItem(storageKey, JSON.stringify(this.preferences));
    }

    setupEventListeners() {
        const chatInputs = ['chat-input', 'ai-chat-input'];
        chatInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        if (inputId === 'chat-input') {
                            askClaude();
                        } else {
                            askAI();
                        }
                    }
                });
            }
        });

        window.addEventListener('resize', () => {
            const sidebar = document.getElementById('sidebar');
            const mainContent = document.querySelector('.main-content');
            
            if (window.innerWidth > 768) {
                if (sidebar && mainContent) {
                    mainContent.style.marginLeft = sidebar.classList.contains('open') ? '300px' : '0';
                }
            } else {
                if (mainContent) {
                    mainContent.style.marginLeft = '0';
                }
            }
        });
    }
}

function toggleSidebar() {
    if (window.app && typeof window.app.toggleSidebar === 'function') {
        window.app.toggleSidebar();
    } else {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.querySelector('.main-content');
        if (sidebar && mainContent) {
            sidebar.classList.toggle('open');
            if (window.innerWidth > 768) {
                mainContent.style.marginLeft = sidebar.classList.contains('open') ? '300px' : '0';
            }
        }
    }
}

function showPage(pageName) {
    if (window.app && typeof window.app.showPage === 'function') {
        window.app.showPage(pageName);
    }
}

function showCommonQuestions() {
    if (window.app && typeof window.app.showCommonQuestions === 'function') {
        window.app.showCommonQuestions();
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
    }
}

function askQuickQuestion(question) {
    if (window.app && typeof window.app.askQuickQuestion === 'function') {
        window.app.askQuickQuestion(question);
    }
}

function updateChatbotContext(analysis) {
    if (window.app && typeof window.app.updateChatbotContext === 'function') {
        window.app.updateChatbotContext(analysis);
    }
}

let app;
document.addEventListener('DOMContentLoaded', function() {
    app = new TerascanApp();
});

function checkStoredAnalyses() {
    const userId = localStorage.getItem('terraScan_userId') || 'unknown';
    const storageKey = `terraScan_${userId}_analysisHistory`;
    const history = localStorage.getItem(storageKey);
    console.log('📊 Stored analyses for user', userId, ':', history ? JSON.parse(history) : 'EMPTY');
    return history ? JSON.parse(history) : [];
}