// notifications.js - Notification System

class NotificationManager {
    constructor() {
        this.notifications = [];
        this.isEnabled = true;
        this.init();
    }

    init() {
        this.loadStoredNotifications();
        this.setupPeriodicChecks();
        console.log('🔔 Notification Manager Initialized');
    }

    // Generate location-based notifications
    generateLocationNotifications(location) {
        if (!location || !this.isEnabled) return;

        const notifications = [];

        // Time-based greetings
        const hour = new Date().getHours();
        let greeting = "Good day";
        if (hour < 12) greeting = "Good morning";
        else if (hour < 18) greeting = "Good afternoon";
        else greeting = "Good evening";

        notifications.push({
            id: 'greeting',
            type: 'info',
            title: `${greeting}!`,
            message: 'Ready to analyze your soil health?',
            priority: 'low',
            timestamp: new Date().toISOString()
        });

        // Weather-based clothing suggestions
        const temp = location.temperature || 25;
        let clothingTip = '';
        if (temp > 30) {
            clothingTip = 'Hot day! Wear light cotton clothes and stay hydrated.';
        } else if (temp > 20) {
            clothingTip = 'Perfect farming weather! Light layers recommended.';
        } else if (temp > 10) {
            clothingTip = 'Cool conditions - a light jacket would be comfortable.';
        } else {
            clothingTip = 'Chilly weather - dress warmly for outdoor work.';
        }

        notifications.push({
            id: 'clothing',
            type: 'info',
            title: '👕 Clothing Tip',
            message: clothingTip,
            priority: 'medium',
            timestamp: new Date().toISOString()
        });

        // Seasonal crop suggestions
        const month = new Date().getMonth();
        let cropAdvice = '';
        
        if (month >= 2 && month <= 5) {
            cropAdvice = 'Spring planting season! Great time for maize, beans, and vegetables.';
        } else if (month >= 6 && month <= 8) {
            cropAdvice = 'Summer growth period - monitor water and consider fast-growing crops.';
        } else if (month >= 9 && month <= 11) {
            cropAdvice = 'Fall harvest time! Prepare for winter crops like kale and spinach.';
        } else {
            cropAdvice = 'Winter planning season - perfect time for soil preparation.';
        }

        notifications.push({
            id: 'crops',
            type: 'info',
            title: '🌱 Crop Advice',
            message: cropAdvice,
            priority: 'medium',
            timestamp: new Date().toISOString()
        });

        // Add all notifications
        notifications.forEach(notification => {
            this.addNotification(notification);
        });

        return notifications;
    }

    // Add a new notification
    addNotification(notification) {
        // Check if notification already exists
        if (this.notifications.find(n => n.id === notification.id)) {
            return;
        }

        this.notifications.unshift(notification);
        
        // Keep only last 20 notifications
        if (this.notifications.length > 20) {
            this.notifications = this.notifications.slice(0, 20);
        }

        this.saveNotifications();
        this.displayNotification(notification);
        
        return notification;
    }

    // Display notification as flash card
    displayNotification(notification) {
        if (!window.app || typeof window.app.showFlashCard !== 'function') {
            console.log('Notification:', notification);
            return;
        }

        const message = `${notification.title} - ${notification.message}`;
        window.app.showFlashCard(message, notification.type);
    }

    // Soil analysis notifications
    generateSoilNotifications(analysis) {
        if (!analysis) return;

        const notifications = [];
        const score = analysis.healthScore;

        // Score-based notifications
        if (score >= 70) {
            notifications.push({
                id: `soil-excellent-${Date.now()}`,
                type: 'info',
                title: '🎉 Excellent Soil Health!',
                message: 'Your soil is in great condition! Maintain your current practices.',
                priority: 'low',
                timestamp: new Date().toISOString()
            });
        } else if (score >= 40) {
            notifications.push({
                id: `soil-good-${Date.now()}`,
                type: 'info',
                title: '💪 Good Soil Potential',
                message: 'Your soil has good potential with some improvements.',
                priority: 'medium',
                timestamp: new Date().toISOString()
            });
        } else {
            notifications.push({
                id: `soil-needs-care-${Date.now()}`,
                type: 'warning',
                title: '🌱 Soil Needs Attention',
                message: 'Your soil would benefit from immediate care and improvement.',
                priority: 'high',
                timestamp: new Date().toISOString()
            });
        }

        // Moisture-based notifications
        const moisture = analysis.moisture * 100;
        if (moisture < 30) {
            notifications.push({
                id: `low-moisture-${Date.now()}`,
                type: 'warning',
                title: '💧 Low Soil Moisture',
                message: 'Consider irrigation or water conservation techniques.',
                priority: 'medium',
                timestamp: new Date().toISOString()
            });
        } else if (moisture > 70) {
            notifications.push({
                id: `high-moisture-${Date.now()}`,
                type: 'info',
                title: '💧 Good Moisture Levels',
                message: 'Monitor drainage to prevent waterlogging.',
                priority: 'low',
                timestamp: new Date().toISOString()
            });
        }

        // Add all soil notifications
        notifications.forEach(notification => {
            this.addNotification(notification);
        });

        return notifications;
    }

    // Get notifications for display
    getNotifications(limit = 10) {
        return this.notifications.slice(0, limit);
    }

    // Clear all notifications
    clearNotifications() {
        this.notifications = [];
        this.saveNotifications();
        this.updateNotificationsDisplay();
    }

    // Remove specific notification
    removeNotification(notificationId) {
        this.notifications = this.notifications.filter(n => n.id !== notificationId);
        this.saveNotifications();
        this.updateNotificationsDisplay();
    }

    // Update notifications display in sidebar
    updateNotificationsDisplay() {
        const notificationsList = document.getElementById('notifications-list');
        if (!notificationsList) return;

        const recentNotifications = this.getNotifications(5);
        
        if (recentNotifications.length === 0) {
            notificationsList.innerHTML = `
                <div class="notification-item">
                    <strong>All caught up!</strong>
                    <p>No new notifications</p>
                </div>
            `;
        } else {
            notificationsList.innerHTML = recentNotifications.map(notification => `
                <div class="notification-item ${notification.type}">
                    <strong>${notification.title}</strong>
                    <p>${notification.message}</p>
                    <small>${new Date(notification.timestamp).toLocaleTimeString()}</small>
                </div>
            `).join('');
        }
    }

    // Setup periodic notification checks
    setupPeriodicChecks() {
        // Check every 30 minutes for new notifications
        setInterval(() => {
            this.checkForPeriodicNotifications();
        }, 30 * 60 * 1000);

        // Daily reminder at 8 AM
        this.setupDailyReminder();
    }

    checkForPeriodicNotifications() {
        const now = new Date();
        const hour = now.getHours();

        // Only send notifications during reasonable hours (6 AM - 8 PM)
        if (hour >= 6 && hour <= 20) {
            const tips = [
                "Remember to check your soil moisture regularly!",
                "Consider crop rotation for better soil health.",
                "Perfect time for adding organic compost!",
                "Monitor your plants for signs of nutrient deficiency.",
                "Stay hydrated while working in the field!",
                "Great weather for planting today!",
                "Check local market prices for your crops."
            ];

            const randomTip = tips[Math.floor(Math.random() * tips.length)];
            
            this.addNotification({
                id: `periodic-${Date.now()}`,
                type: 'info',
                title: '💡 Farming Tip',
                message: randomTip,
                priority: 'low',
                timestamp: now.toISOString()
            });
        }
    }

    setupDailyReminder() {
        const now = new Date();
        const next8AM = new Date();
        next8AM.setHours(8, 0, 0, 0);
        
        if (now > next8AM) {
            next8AM.setDate(next8AM.getDate() + 1);
        }

        const timeUntil8AM = next8AM.getTime() - now.getTime();

        setTimeout(() => {
            this.addNotification({
                id: 'daily-reminder',
                type: 'info',
                title: '🌅 Good Morning!',
                message: 'Perfect time to check your soil conditions and plan your farming activities.',
                priority: 'low',
                timestamp: new Date().toISOString()
            });

            // Set up the next daily reminder
            this.setupDailyReminder();
        }, timeUntil8AM);
    }

    // Data persistence
    saveNotifications() {
        localStorage.setItem('terraScan_notifications', JSON.stringify(this.notifications));
    }

    loadStoredNotifications() {
        try {
            const stored = localStorage.getItem('terraScan_notifications');
            if (stored) {
                this.notifications = JSON.parse(stored);
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
            this.notifications = [];
        }
    }

    // Enable/disable notifications
    toggleNotifications(enabled) {
        this.isEnabled = enabled;
        localStorage.setItem('terraScan_notificationsEnabled', enabled.toString());
    }

    isNotificationsEnabled() {
        const stored = localStorage.getItem('terraScan_notificationsEnabled');
        return stored ? stored === 'true' : true;
    }
}

// Initialize notification manager
const notificationManager = new NotificationManager();

// Export functions for global access
window.generateSoilNotifications = (analysis) => {
    return notificationManager.generateSoilNotifications(analysis);
};

window.generateLocationNotifications = (location) => {
    return notificationManager.generateLocationNotifications(location);
};

window.clearAllNotifications = () => {
    notificationManager.clearNotifications();
};