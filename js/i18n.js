// frontend/js/i18n.js
let translations = {};

// Function to get the current language from localStorage or default to English
function getCurrentLanguage() {
    return localStorage.getItem('userLanguage') || 'en';
}

// Function to set the language, save it, and reload the page to apply changes
function setLanguage(lang) {
    localStorage.setItem('userLanguage', lang);
    // Reloading is the simplest way to ensure all text is updated
    window.location.reload(); 
}

// Function to fetch the language JSON file
async function loadTranslations() {
    const lang = getCurrentLanguage();
    try {
        // The path needs to be correct relative to where this script is used
        // This path assumes it's being called from the root `frontend/` directory
        const response = await fetch(`lang/${lang}.json`); 
        if (!response.ok) {
            console.error(`Could not load translation file: lang/${lang}.json`);
            // Fallback to English if the language file is not found
            if (lang !== 'en') {
                const enResponse = await fetch('lang/en.json');
                translations = await enResponse.json();
            }
            return;
        }
        translations = await response.json();
    } catch (error) {
        console.error('Error fetching translations:', error);
    }
}

// Function to find all elements with a data-i18n-key and replace their text
function applyTranslations() {
    document.querySelectorAll('[data-i18n-key]').forEach(element => {
        const key = element.dataset.i18nKey;
        if (translations[key]) {
            // Check if the key corresponds to a placeholder
            if (element.placeholder) {
                element.placeholder = translations[key];
            } else {
                element.textContent = translations[key];
            }
        }
    });
}

/**
 * Gets a translated string for a given key.
 * @param {string} key - The key for the translation (e.g., 'th_stock_prefix').
 * @param {string} fallback - The default text to use if the key isn't found.
 * @returns {string} The translated string or the fallback.
 */
function getTranslation(key, fallback) {
    // 'translations' is the global object holding the loaded language data
    if (translations && translations[key]) {
        return translations[key];
    }
    return fallback || key; // Return the fallback text or the key itself
}

// Main function to initialize the internationalization
async function initI18n() {
    await loadTranslations();
    applyTranslations();
}

// --- Language Switcher UI ---
function createLanguageSwitcher(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const currentLang = getCurrentLanguage();

    const switcherHTML = `
        <div class="language-switcher">
            <button class="lang-btn ${currentLang === 'en' ? 'active' : ''}" data-lang="en">EN</button>
            <button class="lang-btn ${currentLang === 'km' ? 'active' : ''}" data-lang="km">KH</button>
        </div>
    `;
    container.innerHTML = switcherHTML;

    container.addEventListener('click', (e) => {
        if (e.target.classList.contains('lang-btn')) {
            const lang = e.target.dataset.lang;
            if (lang !== currentLang) {
                setLanguage(lang);
            }
        }
    });
}