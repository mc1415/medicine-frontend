// frontend/admin/js/modules/reports.js
document.addEventListener('DOMContentLoaded', () => {
    
    const user = getUser();
    document.getElementById('user-name').textContent = user.fullName;
    document.getElementById('logout-btn').addEventListener('click', logout);

    // --- Selections ---
    const generateBtn = document.getElementById('generate-sales-report-btn');
    const startDateInput = document.getElementById('sales-start-date');
    const endDateInput = document.getElementById('sales-end-date');
    
    const reportModal = document.getElementById('report-modal');
    const reportModalTitle = document.getElementById('report-modal-title');
    const reportModalBody = document.getElementById('report-modal-body');
    const closeModalBtn = reportModal.querySelector('.close-btn');

    // --- Functions ---
    async function handleGenerateReport() {
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;

        if (!startDate || !endDate) {
            alert('Please select both a start and end date.');
            return;
        }

        try {
            reportModalBody.innerHTML = '<p>Generating report...</p>';
            reportModal.style.display = 'block';

            // Construct the URL with query parameters
            const endpoint = `/reports/sales?start_date=${startDate}&end_date=${endDate}`;
            const reportData = await apiFetch(endpoint);

            displayReport(reportData);

        } catch (error) {
            reportModalBody.innerHTML = `<p class="error-cell">Error: ${error.message}</p>`;
        }
    }

    function displayReport(data) {
        reportModalTitle.textContent = `Sales Report (${data.start_date} to ${data.end_date})`;
        
        const topProduct = data.top_selling_product || { name: 'N/A', units_sold: 0 };

        reportModalBody.innerHTML = `
            <div class="report-summary-grid">
                <div class="summary-item">
                    <h4>Total Sales</h4>
                    <p>${formatPrice(data.total_sales, 'THB')}</p>
                </div>
                <div class="summary-item">
                    <h4>Total Transactions</h4>
                    <p>${data.total_transactions}</p>
                </div>
                <div class="summary-item">
                    <h4>Avg. Transaction Value</h4>
                    <p>${formatPrice(data.average_transaction_value, 'THB')}</p>
                </div>
                <div class="summary-item">
                    <h4>Top Selling Product</h4>
                    <p>${topProduct.name} (${topProduct.units_sold} units)</p>
                </div>
            </div>
        `;
    }

    // --- Event Listeners ---
    generateBtn.addEventListener('click', handleGenerateReport);
    closeModalBtn.addEventListener('click', () => reportModal.style.display = 'none');
});