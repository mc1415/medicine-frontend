// At the top of the file, we can keep the base URL for your own backend.
const API_BASE_URL = 'https://sokhaptaesterk-backend.onrender.com/api'; 

// --- Supabase Client Initialization ---

// First, check if the required AppConfig object and Supabase library exist.
// This prevents errors if scripts are loaded in the wrong order.
if (typeof AppConfig !== 'undefined' && typeof supabase !== 'undefined') {
    
    // Check if the specific keys are present in the config.
    if (AppConfig.SUPABASE_URL && AppConfig.SUPABASE_ANON_KEY) {
        
        // Create the client and attach it to the global 'window' object.
        // This makes it safely accessible to other scripts like inventory.js
        window.supabase = supabase.createClient(AppConfig.SUPABASE_URL, AppConfig.SUPABASE_ANON_KEY);
        
        console.log("✅ Supabase client initialized successfully for frontend.");

    } else {
        console.error("❌ Supabase URL or Key is missing from AppConfig in config.js. Image uploads will fail.");
    }
    
} else {
    console.error("❌ AppConfig or the main Supabase library is not loaded before apiService.js. Image uploads will fail.");
}


// --- Your Existing apiFetch Function (no changes needed) ---

async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem('authToken');
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
            cache: 'no-cache'
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error || errorData.message || `HTTP error! status: ${response.status}`;
            throw new Error(errorMessage);
        }
        
        if (response.status === 204) {
            return null;
        }

        return await response.json();

    } catch (error) {
        console.error(`API Fetch Error (${endpoint}):`, error.message);
        if (error.message.includes('Invalid Token') || error.message.includes('Unauthorized')) {
            alert('Your session has expired. Please log in again.');
            logout(); // Assuming logout() is a global function from auth.js
        }
        throw error;
    }
}