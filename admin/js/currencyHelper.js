// In frontend/js/currencyHelper.js

// This global object will be populated ONCE when the promise resolves.
window.AppCurrencies = {};

// This creates a single, global promise that the entire app can wait for.
// The () at the end starts the data fetching process as soon as this script is loaded.
window.currencyInitializationPromise = (async () => {
    try {
        // This is the only place we await the API call for currencies.
        const ratesData = await apiFetch('/settings/currencies');
        
        const currenciesObject = {};
        ratesData.forEach(currency => {
            currenciesObject[currency.code] = {
                symbol: currency.symbol,
                name: currency.name,
                rate_to_base: currency.rate_to_base
            };
        });
        
        window.AppCurrencies = currenciesObject;
        console.log("✅ Currency rates loaded and ready.");

    } catch (error) {
        console.error("❌ Failed to initialize currency system:", error);
        // Provide a safe fallback so the app doesn't crash if the API fails.
        window.AppCurrencies = {
            'KHR': { symbol: '៛', rate_to_base: 1.0, name: 'Cambodian Riel' },
            'USD': { symbol: '$', rate_to_base: 4000, name: 'US Dollar' }
        };
    }
})();


/**
 * Gets the currently selected currency from localStorage.
 * @returns {string} The currency code (e.g., 'USD', 'KHR').
 */
function getCurrentCurrency() {
    // This assumes AppConfig exists and has BASE_CURRENCY defined.
    return localStorage.getItem('userCurrency') || (window.AppConfig ? AppConfig.BASE_CURRENCY : 'KHR');
}

/**
 * Sets the new currency, saves it, and notifies the application of the change.
 * @param {string} currencyCode The new currency code to set.
 */
function setCurrency(currencyCode) {
    // Check against the dynamically loaded currencies
    if (window.AppCurrencies[currencyCode]) {
        localStorage.setItem('userCurrency', currencyCode);
        window.dispatchEvent(new CustomEvent('currencyChanged'));
    }
}

/**
 * Formats a price from the base currency (KHR) into the target currency.
 * This is a synchronous function that assumes the currency data has already been loaded.
 * @param {number} basePrice The price in KHR.
 * @param {string} targetCurrencyCode The currency code to format into (e.g., 'USD').
 * @returns {string} The formatted price string (e.g., "$92.50", "៛3,200").
 */
function formatPrice(basePrice, targetCurrencyCode) {
    // 1. Safety check: Ensure the target currency data exists.
    const currencyInfo = window.AppCurrencies[targetCurrencyCode];
    if (!currencyInfo) {
        console.warn(`formatPrice: Info for ${targetCurrencyCode} not found in AppCurrencies. Using fallback.`);
        return `${basePrice.toLocaleString()} KHR`; // A safe fallback
    }

    // 2. Perform the conversion using the correct rate from the database.
    // To go FROM the base currency (KHR) TO another currency, we DIVIDE.
    const convertedPrice = basePrice / currencyInfo.rate_to_base;
    const symbol = currencyInfo.symbol;

    // 3. Apply special formatting rules based on the currency code.

    // For KHR, we typically don't want decimal places.
    if (targetCurrencyCode === 'KHR') {
        return `${symbol}${convertedPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    }
    
    // For all other currencies (like USD), format to 2 decimal places.
    // This is a good general rule for most currencies.
    return `${symbol}${convertedPrice.toFixed(2)}`;
}


/**
 * Creates the button-based currency switcher UI.
 * This should only be called AFTER the currencyInitializationPromise has resolved.
 * @param {string} containerId The ID of the HTML element to build the switcher in.
 */
function createCurrencySwitcher(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    let buttonsHtml = '';
    // Loop through the now-populated, dynamically loaded currencies
    for (const code in window.AppCurrencies) {
        const currency = window.AppCurrencies[code];
        buttonsHtml += `<button class="currency-btn" data-currency="${code}">${currency.symbol} ${code}</button>`;
    }
    
    container.innerHTML = `<div class="currency-switcher">${buttonsHtml}</div>`;

    const updateActiveButton = () => {
        const current = getCurrentCurrency();
        container.querySelectorAll('.currency-btn').forEach(button => {
            button.classList.toggle('active', button.dataset.currency === current);
        });
    };

    container.addEventListener('click', (e) => {
        if (e.target.classList.contains('currency-btn')) {
            const currency = e.target.dataset.currency;
            if (currency) {
                setCurrency(currency);
            }
        }
    });

    window.addEventListener('currencyChanged', updateActiveButton);
    
    updateActiveButton();
}
