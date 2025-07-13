// The main listener does not need to be async
document.addEventListener('DOMContentLoaded', async () => {

    await window.currencyInitializationPromise;

    console.log("Currencies are ready. Current state of window.AppCurrencies:", window.AppCurrencies);

    // --- 1. Get the Sale ID from the URL ---
    const urlParams = new URLSearchParams(window.location.search);
    const saleId = urlParams.get('sale_id') || urlParams.get('saleId') || urlParams.get('saleid');
    
    if (!saleId) {
        showError('No Sale ID was found in the URL.');
        return;
    }

    // --- 2. Define the main function to fetch and render ---
    // This function MUST be async
    async function fetchAndRenderReceipt() {
        try {
            // --- THE FIX: Await the global currency promise FIRST ---
            // This pauses execution here until currency rates are loaded.
            await window.currencyInitializationPromise;

            console.log(`Currencies loaded. Now fetching details for saleId: ${saleId}`);
            const saleDetails = await apiFetch(`/transactions/sales/${saleId}`);
            
            if (!saleDetails) {
                showError('Could not find details for this sale in the database.');
                return;
            }
            
            // Now it is safe to call populateReceipt
            populateReceipt(saleDetails);

            // Wait for rendering to complete before printing
            setTimeout(() => { window.print(); }, 500);

        } catch (error) {
            console.error('Failed to fetch or render receipt:', error);
            showError(`Failed to fetch receipt data: ${error.message}`);
        }
    }

    // --- 3. Start the process ---
    fetchAndRenderReceipt();
});

/**
 * Populates the A5 invoice HTML. This function does NOT need to be async
 * because we guarantee the data is ready before calling it.
 */
function populateReceipt(sale) {
    // Populate header
    const receiptNumber = sale.receipt_number || 0; 
    const formattedReceiptNumber = String(receiptNumber).padStart(5, '0');
    if (document.getElementById('receipt-no')) {
        document.getElementById('receipt-no').textContent = formattedReceiptNumber;
    }
    
    const saleDate = new Date(sale.transaction_time || sale.created_at);
    if (document.getElementById('receipt-day')) {
        document.getElementById('receipt-day').textContent = saleDate.getDate();
        document.getElementById('receipt-month').textContent = saleDate.getMonth() + 1;
        document.getElementById('receipt-year').textContent = saleDate.getFullYear();
    }

    // Populate items
    const itemsBody = document.getElementById('receipt-items-body');
    if (itemsBody) {
        itemsBody.innerHTML = '';
        let itemHtml = '';
        const totalRowsOnPage = 20;
        const itemsToRender = sale.sale_items || [];
        
        itemsToRender.forEach((item, index) => {
            const itemPrice = item.price_at_sale;
            const itemName = item.name_en || 'N/A';
            const amount = item.quantity * itemPrice;
            itemHtml += `
                <tr>
                    <td>${index + 1}</td>
                    <td class="item-name">${itemName}</td>
                    <td>${item.quantity}</td>
                    <td>${formatPrice(itemPrice, 'THB')}</td>
                    <td>${formatPrice(amount, 'THB')}</td>
                </tr>
            `;
        });
        
        // Fill remaining rows to ensure consistent table height
        for (let i = itemsToRender.length; i < totalRowsOnPage; i++) {
            itemHtml += `<tr><td>${i + 1}</td><td></td><td></td><td></td><td></td></tr>`;
        }
        itemsBody.innerHTML = itemHtml;
    }

    // Populate totals
    if (document.getElementById('total-thb')) {
        document.getElementById('total-thb').textContent = formatPrice(sale.total_amount, 'THB');
    }
    if (document.getElementById('total-usd')) {
        document.getElementById('total-usd').textContent = formatPrice(sale.total_amount, 'USD');
    }
}

function showError(message) {
     document.body.innerHTML = `<div style="text-align: center; font-family: sans-serif;"><h1>Error</h1><p>${message}</p></div>`;
}
