// frontend/admin/js/i18n.js
let i18n_translations = {};

/**
 * Gets the current language from localStorage, defaulting to 'en'.
 * @returns {string} The current language code ('en' or 'km').
 */
function getCurrentLanguage() {
    return localStorage.getItem('adminLanguage') || 'en';
}

/**
 * Sets the new language, saves it to localStorage, and reloads the page.
 * @param {string} lang The language code to switch to.
 */
function setLanguage(lang) {
    localStorage.setItem('adminLanguage', lang);
    window.location.reload();
}

/**
 * Fetches the appropriate language JSON file.
 */
async function loadTranslations() {
    const lang = getCurrentLanguage();
    try {
        // The path is relative to the admin HTML files
        const response = await fetch(`lang/${lang}.json`); 
        if (!response.ok) throw new Error('Translation file not found');
        i18n_translations = await response.json();
    } catch (error) {
        console.error(`Could not load translations for ${lang}:`, error);
        // Fallback to English if the selected language file fails to load
        const response = await fetch(`lang/en.json`);
        i18n_translations = await response.json();
    }
}

/**
 * Finds all elements with a 'data-i18n-key' and updates their text.
 */
function applyTranslations() {
    document.querySelectorAll('[data-i18n-key]').forEach(element => {
        const key = element.dataset.i18nKey;
        if (i18n_translations[key]) {
            element.textContent = i18n_translations[key];
        }
    });
}

/**
 * ---- NEW FUNCTION ----
 * Translates a key and replaces placeholders.
 * @param {string} key The key to translate (e.g., 'product_expiring_soon.in_days_plural').
 * @param {object} replacements An object of placeholders to replace (e.g., { count: 5 }).
 * @returns {string} The translated and formatted string.
 */
function translate(key, replacements = {}) {
    // Navigate through nested keys like 'parent.child.key'
    const keys = key.split('.');
    let translation = keys.reduce((obj, k) => (obj && obj[k] !== 'undefined') ? obj[k] : undefined, i18n_translations);

    // If the key doesn't exist, return the key itself as a fallback
    if (translation === undefined) {
        return key;
    }

    // Replace all placeholders like {{variable}}
    for (const placeholder in replacements) {
        const regex = new RegExp(`{{${placeholder}}}`, 'g');
        translation = translation.replace(regex, replacements[placeholder]);
    }

    return translation;
}


/**
 * Main function to initialize the internationalization on page load.
 */
async function initI18n() {
    await loadTranslations();
    applyTranslations();
}

/**
 * Creates the language switcher UI and attaches its logic.
 * @param {string} containerId The ID of the HTML element where the switcher will be placed.
 */
function createLanguageSwitcher(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const currentLang = getCurrentLanguage();
    container.innerHTML = `
        <button class="lang-btn ${currentLang === 'en' ? 'active' : ''}" data-lang="en">EN</button>
        <button class="lang-btn ${currentLang === 'km' ? 'active' : ''}" data-lang="km">KH</button>
    `;

    container.addEventListener('click', (e) => {
        if (e.target.classList.contains('lang-btn')) {
            const lang = e.target.dataset.lang;
            if (lang !== getCurrentLanguage()) {
                setLanguage(lang);
            }
        }
    });
}