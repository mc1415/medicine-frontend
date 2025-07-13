document.addEventListener('DOMContentLoaded', () => {

    // --- SELECTIONS ---
    const languageSelect = document.getElementById('language-select');
    const exchangeRateForm = document.getElementById('exchange-rate-form');
    const exchangeRateInputsContainer = document.getElementById('exchange-rate-inputs');

    // --- INITIALIZATION ---
    function initializeSettings() {
        // Set the language dropdown to the current language
        languageSelect.value = getCurrentLanguage();
        // Fetch and display the current currency rates
        fetchAndRenderRates();
    }

    // --- CURRENCY RATE LOGIC ---
    async function fetchAndRenderRates() {
        try {
            const rates = await apiFetch('/settings/currencies');
            currencyCache = rates || [];
            exchangeRateInputsContainer.innerHTML = ''; 

            // Find the base currency to use in labels
            const baseCurrencyCode = 'THB'; 

            rates.forEach(currency => {
                const formGroup = document.createElement('div');
                formGroup.className = 'form-group';
                
                let labelText = '';
                let inputValue = currency.rate_to_base;
                let isDisabled = false;

                if (currency.code === baseCurrencyCode) {
                    // This is the base currency row
                    labelText = `Base Currency (${baseCurrencyCode})`;
                    isDisabled = true;
                } else {
                    // This is for all other currencies
                    labelText = `1 ${currency.code} = ? ${baseCurrencyCode}`;
                }

                formGroup.innerHTML = `
                    <label for="rate-${currency.code}">${labelText}</label>
                    <input 
                        type="number" 
                        id="rate-${currency.code}" 
                        class="settings-select"
                        data-code="${currency.code}"
                        value="${inputValue}"
                        step="0.01"
                        ${isDisabled ? 'disabled' : ''}
                    />
                    ${isDisabled ? '<small class="text-light">Rate is always 1.0</small>' : ''}
                `;
                exchangeRateInputsContainer.appendChild(formGroup);
            });

        } catch (error) {
            exchangeRateInputsContainer.innerHTML = `<p class="error-cell">Error: ${error.message}</p>`;
        }
    }

    async function handleRateFormSubmit(e) {
        e.preventDefault();
        const inputs = exchangeRateInputsContainer.querySelectorAll('input[type="number"]');
        
        const ratesToUpdate = [];
        inputs.forEach(input => {
            if (!input.disabled) {
                // Find the full currency object from our cache
                const fullCurrencyData = currencyCache.find(c => c.code === input.dataset.code);
                
                if (fullCurrencyData) {
                    ratesToUpdate.push({
                        code: fullCurrencyData.code,
                        name: fullCurrencyData.name,     // <-- Include the name
                        symbol: fullCurrencyData.symbol, // <-- Include the symbol
                        rate_to_base: parseFloat(input.value)
                    });
                }
            }
        });
        
        if (ratesToUpdate.length === 0) {
            alert('No rates to update.');
            return;
        }

        try {
            await apiFetch('/settings/currencies', {
                method: 'POST',
                body: JSON.stringify(ratesToUpdate)
            });
            alert('Exchange rates updated successfully!');
            // Refresh the data to ensure consistency
            fetchAndRenderRates();
        } catch (error) {
            alert(`Error updating rates: ${error.message}`);
        }
    }


    // --- EVENT LISTENERS ---
    languageSelect.addEventListener('change', (e) => {
        setLanguage(e.target.value);
    });

    exchangeRateForm.addEventListener('submit', handleRateFormSubmit);


    // --- INITIAL LOAD ---
    initializeSettings();
});