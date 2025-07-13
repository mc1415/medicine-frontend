document.addEventListener('DOMContentLoaded', () => {

    // --- SETUP ---
    const tableBody = document.getElementById('history-table-body');

    // --- CORE FUNCTIONS ---

    /**
     * Formats a UTC timestamp string into GMT+7 (Indochina Time).
     * @param {string} utcTimestamp - The timestamp from Supabase (e.g., "2025-06-18T23:16:05.894772+00:00").
     * @returns {string} A formatted date and time string.
     */
    function formatToGMT7(utcTimestamp) {
        if (!utcTimestamp) return 'N/A';

        const date = new Date(utcTimestamp);
        
        // Use Intl.DateTimeFormat for robust, locale-aware formatting.
        const options = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false, // Use 24-hour format
            timeZone: 'Asia/Bangkok' // This covers GMT+7 (Indochina Time)
        };

        return new Intl.DateTimeFormat('en-GB', options).format(date);
    }

    async function fetchAndRenderHistory() {
        try {
            tableBody.innerHTML = `<tr><td colspan="7" class="loading-cell">Loading purchase history...</td></tr>`;
            
            const historyData = await apiFetch('/transactions/purchase-history');
            
            tableBody.innerHTML = '';
            if (!historyData || historyData.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="7" class="loading-cell">No purchase history found.</td></tr>`;
                return;
            }

            historyData.forEach(record => {
                const row = document.createElement('tr');

                // Graceful handling of potentially null nested data
                const productName = record.product ? record.product.name_en : 'N/A';
                const productSku = record.product ? record.product.sku : 'N/A';
                const warehouseName = record.warehouse ? record.warehouse.name : 'N/A';
                const staffName = record.staff ? record.staff.full_name : 'System';

                row.innerHTML = `
                    <td>${formatToGMT7(record.created_at)}</td>
                    <td>${productName}</td>
                    <td>${productSku}</td>
                    <td><span class="stock-level in-stock">+${record.adjustment_quantity}</span></td>
                    <td>${warehouseName}</td>
                    <td>${staffName}</td>
                    <td>${record.notes || ''}</td>
                `;
                tableBody.appendChild(row);
            });

        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="7" class="error-cell">Error: ${error.message}</td></tr>`;
        }
    }

    // --- INITIAL LOAD ---
    // Make sure sidebar logic is initialized if it's separate
    if (typeof initializeSidebar === 'function') {
        initializeSidebar();
    }
    fetchAndRenderHistory();
});