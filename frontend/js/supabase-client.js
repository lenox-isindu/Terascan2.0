// supabase-client.js - Authentication & Database

const SUPABASE_URL = 'https://ohlmrqmiyttqsjfvhdlx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obG1ycW1peXR0cXNqZnZoZGx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3OTEzNzgsImV4cCI6MjA3NTM2NzM3OH0.Bc10mImdyMYF8NEITnDDXaqUSbImLGQT-fHSpDWffQ0';

// Initialize Supabase
let supabase;

function initSupabase() {
    try {
        if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('✅ Supabase initialized successfully');
            return true;
        } else {
            console.error('❌ Supabase not found. Check CDN loading.');
            return false;
        }
    } catch (error) {
        console.error('❌ Error initializing Supabase:', error);
        return false;
    }
}

// Wait for page load and initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 Page loaded, initializing Supabase...');
    
    if (!initSupabase()) {
        setTimeout(() => {
            if (!initSupabase()) {
                console.error('❌ Failed to initialize Supabase after retry');
            }
        }, 1000);
    }
});

// Auth functions
async function signUp() {
    if (!supabase) {
        const success = initSupabase();
        if (!success) {
            alert('Supabase not ready. Please wait and try again.');
            return;
        }
    }
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        alert('Please enter both email and password');
        return;
    }
    
    try {
        console.log('📨 Attempting sign up...');
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
        });
        
        if (error) {
            alert('Error signing up: ' + error.message);
            console.error('Sign up error:', error);
        } else {
            alert('Sign up successful! You can now sign in.');
            document.getElementById('email').value = '';
            document.getElementById('password').value = '';
            console.log('Sign up successful:', data);
        }
    } catch (error) {
        alert('Unexpected error: ' + error.message);
        console.error('Unexpected sign up error:', error);
    }
}

async function signIn() {
    if (!supabase) {
        const success = initSupabase();
        if (!success) {
            alert('Supabase not ready. Please wait and try again.');
            return;
        }
    }
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        alert('Please enter both email and password');
        return;
    }
    
    try {
        console.log('🔐 Attempting sign in...');
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });
        
        if (error) {
            alert('Error signing in: ' + error.message);
            console.error('Sign in error:', error);
        } else {
            showApp();
            document.getElementById('user-email').textContent = data.user.email;
            document.getElementById('email').value = '';
            document.getElementById('password').value = '';
            console.log('Sign in successful:', data);
        }
    } catch (error) {
        alert('Unexpected error: ' + error.message);
        console.error('Unexpected sign in error:', error);
    }
}

async function signOut() {
    if (!supabase) {
        console.warn('Supabase not initialized during sign out');
        showLanding();
        return;
    }
    
    try {
        const { error } = await supabase.auth.signOut();
        if (error) {
            alert('Error signing out: ' + error.message);
        } else {
            showLanding();
            console.log('Sign out successful');
        }
    } catch (error) {
        alert('Unexpected error: ' + error.message);
    }
}

// Auth state listener
function setupAuthListener() {
    if (supabase) {
        supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event, session ? 'User logged in' : 'User logged out');
            if (session) {
                showApp();
                document.getElementById('user-email').textContent = session.user.email;
            }
        });
    }
}

// Initialize auth listener
setTimeout(setupAuthListener, 2000);

// Navigation functions
function showLanding() {
    document.getElementById('landing-section').classList.remove('hidden');
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('app-section').classList.add('hidden');
}

function showAuth() {
    document.getElementById('landing-section').classList.add('hidden');
    document.getElementById('auth-section').classList.remove('hidden');
    document.getElementById('app-section').classList.add('hidden');
}

function showApp() {
    document.getElementById('landing-section').classList.add('hidden');
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('app-section').classList.remove('hidden');
}

// Farm management functions (for future use)
async function saveFarm(lat, lng, farmName = 'My Farm') {
    if (!supabase) {
        console.error('Supabase not initialized');
        return null;
    }
    
    try {
        console.log('💾 Saving farm to database...', { lat, lng, farmName });
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.error('No user logged in');
            return null;
        }
        
        const { data, error } = await supabase
            .from('farms')
            .insert([
                { 
                    user_id: user.id,
                    name: farmName, 
                    coordinates: `POINT(${lng} ${lat})`
                }
            ])
            .select();
        
        if (error) {
            console.error('❌ Error saving farm:', error);
            return null;
        }
        
        console.log('✅ Farm saved successfully:', data);
        return data[0].id;
    } catch (error) {
        console.error('💥 Unexpected error saving farm:', error);
        return null;
    }
}

async function saveSoilAnalysis(farmId, score, risk, ndvi, moisture, recommendations) {
    if (!supabase) {
        console.error('Supabase not initialized in saveSoilAnalysis');
        return;
    }
    
    try {
        console.log('💾 Saving soil analysis...', { 
            farmId, score, risk, ndvi, moisture, recommendations 
        });
        
        const { error } = await supabase
            .from('soil_analysis')
            .insert([
                {
                    farm_id: farmId,
                    health_score: score,
                    risk_level: risk,
                    ndvi_value: ndvi,
                    moisture_level: moisture,
                    recommendations: recommendations
                }
            ]);
        
        if (error) {
            console.error('❌ Error saving analysis:', error);
        } else {
            console.log('✅ Soil analysis saved successfully');
        }
    } catch (error) {
        console.error('💥 Unexpected error saving analysis:', error);
    }
}