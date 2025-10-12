// map-handler.js - Fixed Map Management

let terascanMap;
let currentMarker;
let userLocationMarker;
let accuracyCircle;
let isMapInitialized = false;

// Initialize Map
function initTerascanMap() {
    if (isMapInitialized) {
        console.log('🗺️ Map already initialized');
        return;
    }
    
    console.log('🗺️ Initializing map...');
    
    try {
        const mapElement = document.getElementById('map');
        if (!mapElement) {
            console.error('❌ Map element not found');
            return;
        }

        // Create map with Kenya center
        terascanMap = L.map('map', {
            center: [-1.2921, 36.8219],
            zoom: 8,
            zoomControl: true,
            scrollWheelZoom: true,
            doubleClickZoom: true,
            boxZoom: true,
            keyboard: true,
            dragging: true
        });
        
        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19,
            minZoom: 2
        }).addTo(terascanMap);
        
        // Add zoom control to top right
        terascanMap.zoomControl.setPosition('topright');
        
        // Add click event to map
        terascanMap.on('click', function(e) {
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;
            
            console.log('📍 Map clicked:', lat, lng);
            addMarker(lat, lng);
            updateLocationDisplay(lat, lng);
            
            // Analyze the location
            if (typeof analyzeLocation === 'function') {
                analyzeLocation(lat, lng);
            } else {
                console.error('❌ analyzeLocation function not found');
            }
        });
        
        isMapInitialized = true;
        console.log("✅ Map initialized successfully");
        
    } catch (error) {
        console.error('❌ Error initializing map:', error);
    }
}

// Add marker to map
function addMarker(lat, lng) {
    if (!terascanMap) {
        console.error('❌ Map not initialized');
        return;
    }
    
    if (currentMarker) {
        terascanMap.removeLayer(currentMarker);
    }
    
    currentMarker = L.marker([lat, lng]).addTo(terascanMap)
        .bindPopup('Analyzing soil health...')
        .openPopup();
        
    console.log('📍 Marker added at:', lat, lng);
}

// Update location display
function updateLocationDisplay(lat, lng) {
    const display = document.getElementById('location-display');
    if (!display) {
        console.error('❌ location-display element not found');
        return;
    }
    
    display.innerHTML = `<div><i class="fas fa-map-pin"></i> <strong>Getting location name...</strong><br><small>${lat.toFixed(4)}, ${lng.toFixed(4)}</small></div>`;
    
    // Get location name
    getLocationName(lat, lng);
}

// Get location name from coordinates
async function getLocationName(lat, lng) {
    try {
        console.log('🗺️ Getting location name for:', lat, lng);
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`);
        
        if (!response.ok) throw new Error('Geocoding failed');
        
        const data = await response.json();
        
        if (data.display_name) {
            const display = document.getElementById('location-display');
            const address = data.address;
            let locationName = "Selected Location";
            
            if (address) {
                if (address.city) locationName = address.city;
                else if (address.town) locationName = address.town;
                else if (address.village) locationName = address.village;
                else if (address.county) locationName = address.county;
                else if (address.state) locationName = address.state;
                
                if (address.country && address.country !== "Kenya") {
                    locationName += `, ${address.country}`;
                }
            } else {
                locationName = data.display_name.split(',')[0];
            }
            
            window.currentAnalysisLocation = locationName;
            display.innerHTML = `<div><i class="fas fa-map-pin"></i> <strong>${locationName}</strong><br><small>${lat.toFixed(4)}, ${lng.toFixed(4)}</small></div>`;
            
            console.log('📍 Location name:', locationName);
        }
    } catch (error) {
        console.log('❌ Could not get location name:', error);
        window.currentAnalysisLocation = "Selected Location";
    }
}

// GPS Location Functions
function getCurrentLocation() {
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by this browser.");
        return;
    }

    const gpsButton = document.querySelector('.btn-gps');
    if (!gpsButton) {
        console.error('❌ GPS button not found');
        return;
    }

    const originalText = gpsButton.innerHTML;
    gpsButton.innerHTML = '<div class="loading-spinner" style="width: 16px; height: 16px; display: inline-block;"></div> Finding...';
    gpsButton.disabled = true;

    navigator.geolocation.getCurrentPosition(
        function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const accuracy = position.coords.accuracy;
            
            console.log("📍 GPS Location found:", lat, lng, "Accuracy:", accuracy + "m");
            
            // Center map on location
            if (terascanMap) {
                terascanMap.setView([lat, lng], 15);
                
                // Add marker
                addMarker(lat, lng);
                
                // Add accuracy circle
                if (accuracyCircle) {
                    terascanMap.removeLayer(accuracyCircle);
                }
                accuracyCircle = L.circle([lat, lng], {
                    color: '#10b981',
                    fillColor: '#10b981',
                    fillOpacity: 0.15,
                    radius: accuracy
                }).addTo(terascanMap).bindPopup(`Your location accuracy: ${Math.round(accuracy)} meters`);
                
                // Update location display
                updateLocationDisplay(lat, lng);
                
                // Auto-analyze with location name
                setTimeout(() => {
                    if (typeof analyzeLocation === 'function') {
                        analyzeLocation(lat, lng);
                    }
                }, 1500);
            } else {
                console.error('❌ Map not initialized for GPS location');
                // Try to initialize map first
                initTerascanMap();
                setTimeout(() => {
                    if (terascanMap) {
                        terascanMap.setView([lat, lng], 15);
                        addMarker(lat, lng);
                        updateLocationDisplay(lat, lng);
                    }
                }, 500);
            }
            
            // Reset button
            gpsButton.innerHTML = originalText;
            gpsButton.disabled = false;
        },
        function(error) {
            console.error("❌ Geolocation error:", error);
            let message = "Unable to get your location. ";
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    message += "Please allow location access in your browser settings.";
                    break;
                case error.POSITION_UNAVAILABLE:
                    message += "Location information is unavailable.";
                    break;
                case error.TIMEOUT:
                    message += "Location request timed out.";
                    break;
                default:
                    message += "Please try again.";
            }
            alert(message);
            
            gpsButton.innerHTML = '<i class="fas fa-location-crosshairs"></i> My Location';
            gpsButton.disabled = false;
        },
        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 30000
        }
    );
}

function resetMapView() {
    if (!terascanMap) {
        console.error('❌ Map not initialized');
        // Try to initialize map
        initTerascanMap();
        return;
    }
    
    terascanMap.setView([-1.2921, 36.8219], 8);
    window.currentAnalysisLocation = "Selected Location";
    const display = document.getElementById('location-display');
    if (display) {
        display.innerHTML = `<div><i class="fas fa-map-pin"></i> <strong>Click on map or use "My Location"</strong></div>`;
    }
}

// Location Search
async function searchLocation() {
    const searchInput = document.getElementById('location-search');
    if (!searchInput) {
        console.error('❌ Location search input not found');
        return;
    }
    
    const query = searchInput.value.trim();
    if (!query) {
        alert('Please enter a location to search');
        return;
    }

    try {
        console.log('🔍 Searching for location:', query);
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
        
        if (!response.ok) throw new Error('Search failed');
        
        const data = await response.json();
        
        if (data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lng = parseFloat(data[0].lon);
            
            console.log('📍 Search result:', lat, lng);
            
            if (terascanMap) {
                terascanMap.setView([lat, lng], 14);
                addMarker(lat, lng);
                updateLocationDisplay(lat, lng);
                
                setTimeout(() => {
                    if (typeof analyzeLocation === 'function') {
                        analyzeLocation(lat, lng);
                    }
                }, 1000);
            } else {
                console.error('❌ Map not initialized for search');
                initTerascanMap();
                setTimeout(() => {
                    if (terascanMap) {
                        terascanMap.setView([lat, lng], 14);
                        addMarker(lat, lng);
                        updateLocationDisplay(lat, lng);
                    }
                }, 500);
            }
        } else {
            alert('Location not found. Please try a different search.');
        }
    } catch (error) {
        console.error('❌ Search error:', error);
        alert('Error searching location. Please check your connection and try again.');
    }
}

// Set up when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM loaded, setting up map handlers...');
    
    // Set up search input
    const searchInput = document.getElementById('location-search');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchLocation();
            }
        });
    }
    
    // Set initial location name
    window.currentAnalysisLocation = "Selected Location";
    
    // Initialize map when app section becomes visible
    const appSection = document.getElementById('app-section');
    if (appSection) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    if (!appSection.classList.contains('hidden')) {
                        console.log('🚀 App section visible, initializing map...');
                        setTimeout(initTerascanMap, 500);
                    }
                }
            });
        });

        observer.observe(appSection, {
            attributes: true,
            attributeFilter: ['class']
        });
    }
});

// Export functions for global access
window.initTerascanMap = initTerascanMap;
window.getCurrentLocation = getCurrentLocation;
window.resetMapView = resetMapView;
window.searchLocation = searchLocation;
window.addMarker = addMarker;