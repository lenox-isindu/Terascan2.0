// app.js - Fixed Version with UUID Support and Duplicate Prevention

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
        this.lastAnalysisId = null; // Track last analysis to prevent duplicates
        
        this.init();
    }

    init() {
        this.setupNavigation();
        this.loadCommonQuestions();
        this.setupEventListeners();
        
        // Migrate old data before loading
        this.migrateOldAnalyses();
        
        this.loadStoredData();
        this.startLocationTracking();
        
        console.log('🚀 Terascan App Initialized');
        
        setTimeout(() => {
            this.showWelcomeMessage();
        }, 1000);
    }

    // UUID Generation and Migration Methods
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    isUUID(id) {
        if (!id) return false;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(id.toString());
    }

    migrateOldAnalyses() {
        const storageKey = this.getUserStorageKey('analysisHistory');
        const storedHistory = localStorage.getItem(storageKey);
        
        if (storedHistory) {
            const history = JSON.parse(storedHistory);
            let needsMigration = false;
            
            const migratedHistory = history.map(item => {
                // If item has numeric ID, migrate it to UUID
                if (!this.isUUID(item.id)) {
                    needsMigration = true;
                    console.log('🔄 Migrating old ID:', item.id, 'to UUID');
                    return {
                        ...item,
                        id: this.generateUUID(),
                        originalId: item.id // Keep original for reference
                    };
                }
                return item;
            });
            
            if (needsMigration) {
                localStorage.setItem(storageKey, JSON.stringify(migratedHistory));
                console.log('✅ Migrated old analysis IDs to UUID format');
                this.analysisHistory = migratedHistory;
            }
        }
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
        
        // Don't auto-analyze on page load to prevent duplicates
        // Let user manually analyze if they want fresh data
    }

    getUserName() {
        return localStorage.getItem('terraScan_userName') || 'User';
    }

    // Modified to prevent duplicate auto-analysis
    autoAnalyzeCurrentLocation() {
        if (!this.userLocation) return;
        
        console.log('🔄 Auto-analyzing current location...');
        
        // Check if we already have a recent analysis for this location
        const recentAnalysis = this.getRecentAnalysisForLocation(this.userLocation.lat, this.userLocation.lng);
        if (recentAnalysis && this.isAnalysisRecent(recentAnalysis)) {
            console.log('📊 Using recent analysis instead of creating duplicate');
            this.updateChatbotContext(recentAnalysis);
            this.updateSidebarTips(recentAnalysis);
            return;
        }
        
        setTimeout(() => {
            const mockAnalysis = this.generateMockAnalysis(this.userLocation);
            this.addToHistory(mockAnalysis);
            
            this.updateChatbotContext(mockAnalysis);
            this.updateSidebarTips(mockAnalysis);
            
            this.showFlashCard('✅ Auto-analysis complete! Check Today\'s Tips for recommendations.', 'info');
        }, 1500);
    }

    // Helper method to check for recent analysis at location
    getRecentAnalysisForLocation(lat, lng, maxDistanceKm = 1, maxAgeMinutes = 60) {
        const now = new Date();
        return this.analysisHistory.find(analysis => {
            const distance = this.calculateDistance(lat, lng, analysis.lat, analysis.lng);
            const ageMinutes = (now - new Date(analysis.timestamp)) / (1000 * 60);
            return distance <= maxDistanceKm && ageMinutes <= maxAgeMinutes;
        });
    }

    // Helper method to calculate distance between coordinates
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    // Helper method to check if analysis is recent
    isAnalysisRecent(analysis, maxAgeMinutes = 60) {
        const now = new Date();
        const analysisTime = new Date(analysis.timestamp);
        const ageMinutes = (now - analysisTime) / (1000 * 60);
        return ageMinutes <= maxAgeMinutes;
    }

    generateMockAnalysis(location) {
        const baseScore = Math.floor(Math.random() * 30) + 60;
        const temperature = this.getCurrentTemperature();
        
        return {
            id: this.generateUUID(), // Use UUID instead of Date.now()
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
                    
                    // Don't auto-analyze immediately to prevent duplicates
                    // Let user manually analyze if they want fresh data
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
async loadAnalysisHistory() {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;

    // Try to load from Supabase first
    try {
        await this.loadHistoryFromSupabase();
        
        // If Supabase is empty but we have local data, sync it
        if (this.analysisHistory.length === 0) {
            await this.syncLocalHistoryToSupabase();
            // Try loading from Supabase again after sync
            await this.loadHistoryFromSupabase();
        }
        
    } catch (error) {
        console.warn('Failed to load from Supabase, using localStorage:', error);
        this.loadHistoryFromLocalStorage();
    }

    console.log(`📊 Loading history for user ${this.userId}:`, this.analysisHistory);

    this.renderHistoryList(historyList);
}

    async loadHistoryFromSupabase() {
        if (typeof supabase === 'undefined') {
            throw new Error('Supabase not available');
        }

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
            throw new Error('No authenticated user');
        }

        console.log('📥 Loading history from Supabase for user:', user.id);

        const { data, error } = await supabase
            .from('analysis_history')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Supabase query error:', error);
            throw error;
        }

        if (data && data.length > 0) {
            // Convert Supabase data to app format
            this.analysisHistory = data.map(item => ({
                id: item.id,
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lng),
                locationName: item.location_name,
                healthScore: parseInt(item.health_score),
                riskLevel: item.risk_level,
                ndvi: parseFloat(item.ndvi),
                moisture: parseFloat(item.moisture),
                temperature: item.temperature ? parseFloat(item.temperature) : null,
                climateZone: item.climate_zone,
                recommendations: item.recommendations || [],
                timestamp: item.created_at,
                userId: user.id
            }));

            // Update localStorage with Supabase data
            const storageKey = this.getUserStorageKey('analysisHistory');
            localStorage.setItem(storageKey, JSON.stringify(this.analysisHistory));
            
            console.log(`✅ Loaded ${this.analysisHistory.length} analyses from Supabase`);
        } else {
            // Fallback to localStorage if no Supabase data
            this.loadHistoryFromLocalStorage();
        }
    }

    // Add this method to sync localStorage data to Supabase
async syncLocalHistoryToSupabase() {
    try {
        const storageKey = this.getUserStorageKey('analysisHistory');
        const localHistory = localStorage.getItem(storageKey);
        
        if (!localHistory) {
            console.log('📊 No local history to sync');
            return;
        }

        const analyses = JSON.parse(localHistory);
        console.log(`🔄 Syncing ${analyses.length} local analyses to Supabase`);

        let syncedCount = 0;
        
        for (const analysis of analyses) {
            try {
                await this.saveAnalysisToSupabase(analysis);
                syncedCount++;
            } catch (error) {
                console.warn('Failed to sync analysis:', analysis.id, error);
            }
        }

        console.log(`✅ Successfully synced ${syncedCount}/${analyses.length} analyses to Supabase`);
        
        if (syncedCount > 0) {
            this.showFlashCard(`🔄 Synced ${syncedCount} analyses to cloud`, 'info');
        }
        
    } catch (error) {
        console.error('Error syncing local history to Supabase:', error);
    }
}
    loadHistoryFromLocalStorage() {
        const storageKey = this.getUserStorageKey('analysisHistory');
        const storedHistory = localStorage.getItem(storageKey);
        this.analysisHistory = storedHistory ? JSON.parse(storedHistory) : [];
        
        console.log(`📥 Loaded ${this.analysisHistory.length} analyses from localStorage`);
    }

    renderHistoryList(historyList) {
        if (this.analysisHistory.length === 0) {
            historyList.innerHTML = `
                <div class="history-placeholder">
                    <i class="fas fa-history fa-3x" style="color: var(--gray-light); margin-bottom: 1rem;"></i>
                    <h3>No Analysis History Yet</h3>
                    <p>Start by analyzing locations on the map to build your soil health history</p>
                    <button class="btn-primary" onclick="app.showPage('map-analysis')">
                        <i class="fas fa-map"></i> Start Analyzing
                    </button>
                </div>
            `;
        } else {
            historyList.innerHTML = this.analysisHistory.map(analysis => {
                // Ensure values are numbers
                const ndviValue = parseFloat(analysis.ndvi);
                const moistureValue = parseFloat(analysis.moisture);
                
                return `
                <div class="history-item" onclick="app.viewAnalysisDetails('${analysis.id}')">
                    <div class="history-main">
                        <div class="history-location">
                            <i class="fas fa-map-marker-alt"></i>
                            <strong>${analysis.locationName || 'Unknown Location'}</strong>
                        </div>
                        <div class="history-coordinates">
                            ${parseFloat(analysis.lat).toFixed(4)}, ${parseFloat(analysis.lng).toFixed(4)}
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
                                <i class="fas fa-leaf"></i> NDVI: ${!isNaN(ndviValue) ? ndviValue.toFixed(3) : 'N/A'}
                            </div>
                            <div class="metric-tag">
                                <i class="fas fa-tint"></i> ${!isNaN(moistureValue) ? (moistureValue * 100).toFixed(1) + '%' : 'N/A'}
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
                `;
            }).join('');
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

    async deleteAnalysis(analysisId) {
        if (confirm('Are you sure you want to delete this analysis?')) {
            // Find the analysis to get the correct ID
            const analysis = this.analysisHistory.find(item => item.id === analysisId);
            if (!analysis) {
                console.error('Analysis not found:', analysisId);
                this.showFlashCard('❌ Analysis not found', 'error');
                return;
            }

            // Delete from local history
            this.analysisHistory = this.analysisHistory.filter(item => item.id !== analysisId);
            
            // Delete from localStorage
            const storageKey = this.getUserStorageKey('analysisHistory');
            localStorage.setItem(storageKey, JSON.stringify(this.analysisHistory));
            
            // Delete from Supabase - use the ID from the analysis object
            await this.deleteAnalysisFromSupabase(analysis.id);
            
            this.loadAnalysisHistory();
            this.showFlashCard('🗑️ Analysis deleted from history', 'info');
        }
    }

    async deleteAnalysisFromSupabase(analysisId) {
        try {
            if (typeof supabase === 'undefined') {
                console.warn('Supabase not available for deletion');
                return;
            }

            console.log('🗑️ Attempting to delete analysis with ID:', analysisId, 'Type:', typeof analysisId);

            // Ensure we have a valid UUID
            if (!this.isUUID(analysisId)) {
                console.error('Invalid UUID format for deletion:', analysisId);
                this.showFlashCard('❌ Cannot delete: Invalid analysis ID format', 'error');
                return;
            }

            const { error } = await supabase
                .from('analysis_history')
                .delete()
                .eq('id', analysisId);

            if (error) {
                console.error('Error deleting from Supabase:', error);
                this.showFlashCard('❌ Failed to delete from server', 'error');
            } else {
                console.log('✅ Analysis deleted from Supabase:', analysisId);
            }
        } catch (error) {
            console.error('Failed to delete from Supabase:', error);
            this.showFlashCard('❌ Error during deletion', 'error');
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

    async addToHistory(analysisData) {
        // Check for duplicate analysis (same location within 1km and recent)
        const existingAnalysis = this.getRecentAnalysisForLocation(
            analysisData.lat, 
            analysisData.lng, 
            1, // 1km radius
            30 // 30 minutes
        );

        if (existingAnalysis) {
            console.log('🔄 Using existing analysis instead of creating duplicate');
            this.showFlashCard('📊 Using recent analysis data for this location', 'info');
            return existingAnalysis;
        }

        const historyItem = {
            id: this.generateUUID(),
            timestamp: new Date().toISOString(),
            locationName: window.currentAnalysisLocation || "Selected Location",
            userId: this.userId,
            ...analysisData
        };

        // Add to local history
        this.analysisHistory.unshift(historyItem);
        
        if (this.analysisHistory.length > 50) {
            this.analysisHistory = this.analysisHistory.slice(0, 50);
        }

        // Save to localStorage
        const storageKey = this.getUserStorageKey('analysisHistory');
        localStorage.setItem(storageKey, JSON.stringify(this.analysisHistory));
        
        // Save to Supabase
        await this.saveAnalysisToSupabase(historyItem);
        
        if (this.currentPage === 'analysis-history') {
            this.loadAnalysisHistory();
        }
        
        this.showFlashCard('📊 Analysis saved to history', 'info');
        
        console.log(`💾 Saved analysis to history for user ${this.userId}`, historyItem);
        return historyItem;
    }

    async saveAnalysisToSupabase(analysis) {
    try {
        // Check if Supabase is available
        if (typeof supabase === 'undefined') {
            console.warn('Supabase not available, skipping database save');
            return;
        }

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
            console.warn('No authenticated user, saving to localStorage only:', userError);
            return;
        }

        console.log('💾 Saving analysis to Supabase for user:', user.id);

        // Prepare data for Supabase
        const supabaseData = {
            user_id: user.id, // Use Supabase auth user ID
            lat: parseFloat(analysis.lat),
            lng: parseFloat(analysis.lng),
            location_name: analysis.locationName,
            health_score: parseInt(analysis.healthScore),
            risk_level: analysis.riskLevel,
            ndvi: parseFloat(analysis.ndvi),
            moisture: parseFloat(analysis.moisture),
            temperature: analysis.temperature ? parseFloat(analysis.temperature) : null,
            climate_zone: analysis.climateZone || 'unknown',
            recommendations: analysis.recommendations || [],
            created_at: analysis.timestamp || new Date().toISOString() // Use existing timestamp if available
        };

        console.log('📤 Sending to Supabase:', supabaseData);

        // Insert into analysis_history table
        const { data, error } = await supabase
            .from('analysis_history')
            .insert([supabaseData])
            .select();

        if (error) {
            console.error('❌ Error saving to Supabase:', error);
            throw error;
        }

        console.log('✅ Analysis saved to Supabase:', data);
        return data;

    } catch (error) {
        console.error('💥 Failed to save analysis to Supabase:', error);
    }
}

    loadFarmInsights() {
        // ... existing implementation
    }

    showSoilHealthDetails() {
        // ... existing implementation
    }

    calculateSoilTrend() {
        // ... existing implementation
    }

    getSoilHealthMessage(score) {
        // ... existing implementation
    }

    getSeasonalAdvice() {
        // ... existing implementation
    }

    getWaterAdvice(moisture) {
        // ... existing implementation
    }

    getWaterTips(moisture) {
        // ... existing implementation
    }

    getFieldNotifications(analysis) {
        // ... existing implementation
    }

    getMoistureLevelClass(moisture) {
        // ... existing implementation
    }

    getNDVIClass(ndvi) {
        // ... existing implementation
    }

    loadAIChat() {
        // ... existing implementation
    }

    updateChatbotContext(analysis) {
        // ... existing implementation
    }

    showAnalysisCompletionMessage(analysis) {
        // ... existing implementation
    }

    showFlashCard(message, type = 'info') {
        // ... existing implementation
    }

    loadStoredData() {
        // ... existing implementation
    }

    savePreferences() {
        // ... existing implementation
    }

    setupEventListeners() {
        // ... existing implementation
    }
}

// Global functions remain the same
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