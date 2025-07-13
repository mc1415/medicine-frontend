// frontend/admin/js/modules/sales.js
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. SETUP & SELECTIONS ---
    checkAuth();
    const user = getUser();
    const tableBody = document.getElementById('sales-table-body');
    let salesCache = []; // To store fetched sales data

    // --- 2. INITIAL SETUP ---
    document.getElementById('user-name').textContent = user ? user.fullName : 'Guest';
    document.getElementById('logout-btn').addEventListener('click', logout);

    // --- 3. DATA FETCHING & RENDERING ---
    
    // Fetches sales from the API and triggers the table render
    async function fetchAndRenderSales() {
        try {
            tableBody.innerHTML = `<tr><td colspan="6" class="loading-cell">Loading sales history...</td></tr>`;
            
            // Call the GET endpoint to fetch all sales
            const salesData = await apiFetch('/transactions/sales');
            
            salesCache = salesData || []; // Store the data and handle null response
            renderSalesTable(salesCache); // Render the table with the fetched data
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="6" class="error-cell">Error loading sales: ${error.message}</td></tr>`;
        }
    }

    // Renders the provided sales data into the HTML table
    function renderSalesTable(sales) {
        tableBody.innerHTML = '';
        if (!sales || sales.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" class="loading-cell">No sales found.</td></tr>`;
            return;
        }

        sales.forEach(sale => {
            const row = document.createElement('tr');
            const saleTime = new Date(sale.transaction_time || sale.created_at).toLocaleString();

            // Use formatPrice helper for currency, and fallbacks for receipt number
            row.innerHTML = `
                <td>#${sale.receipt_number || sale.id.substring(0, 8)}</td>
                <td>${saleTime}</td>
                <td>${sale.staff_name || 'N/A'}</td>
                <td>${formatPrice(sale.total_amount, 'THB')}</td>
                <td>${sale.payment_method}</td>
                <td>
                    <button class="btn btn-secondary btn-sm view-details-btn" data-id="${sale.id}">View Details</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    // --- 4. EVENT LISTENERS ---

    // Use event delegation to handle clicks on the "View Details" buttons
    tableBody.addEventListener('click', (e) => {
        // Find the button that was clicked using .closest()
        const viewBtn = e.target.closest('.view-details-btn');

        // If a "View Details" button was actually clicked...
        if (viewBtn) {
            const saleId = viewBtn.dataset.id;
            
            // ...and it has a sale ID...
            if (saleId) {
                // ...open the receipt page in a new tab, passing the ID as a URL parameter.
                window.open(`receipt.html?saleId=${saleId}`, '_blank');
            }
        }
    });

    // --- 5. INITIAL LOAD ---
    fetchAndRenderSales(); // Call the main function to start the page
});
