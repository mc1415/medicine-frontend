// frontend/admin/js/modules/dashboard.js
document.addEventListener('DOMContentLoaded', async () => {
    
    await window.currencyInitializationPromise;

    // --- 1. SETUP & SELECTIONS ---
    const salesTodayEl = document.getElementById('sales-today');
    const salesMonthEl = document.getElementById('sales-month');
    const lowStockCountEl = document.getElementById('low-stock-count');
    const lowStockListEl = document.getElementById('low-stock-list');
    const topProductsChartCanvas = document.getElementById('top-products-chart').getContext('2d');
    const expiringSoonListEl = document.getElementById('expiring-soon-list');
   
    function formatKhmerDateCustom(date) {
        const weekdayName = new Intl.DateTimeFormat('km-KH', { weekday: 'long' }).format(date);
        const monthName = new Intl.DateTimeFormat('km-KH', { month: 'long' }).format(date);

        // 2. Get numeric day and year
        const dayNumeric = date.getDate(); // e.g., 21
        const yearNumeric = date.getFullYear(); // e.g., 2025

        // 3. Convert Arabic numerals to Khmer numerals
        const convertToKhmerNumerals = (num) => {
            const khmerDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
            return String(num).split('').map(digit => khmerDigits[parseInt(digit, 10)]).join('');
        };

        const khmerDayNumeric = convertToKhmerNumerals(dayNumeric);
        const khmerYearNumeric = convertToKhmerNumerals(yearNumeric);

        // 4. Assemble the final string with the correct Khmer particles
        // Note: 'weekdayName' already includes 'ថ្ងៃ' at the beginning (e.g., "ថ្ងៃសៅរ៍")
        // So we don't add "ថ្ងៃ" again.
        return `ថ្ងៃ ${weekdayName} ទី ${khmerDayNumeric} ខែ ${monthName} ឆ្នាំ ${khmerYearNumeric}`;
    }

    // Get the current date (as per your original code)
    const currentDate = new Date();

    // Format the date using our custom function
    const formattedKhmerDate = formatKhmerDateCustom(currentDate);

    // Set the content of the div
    document.getElementById('date-display').textContent = formattedKhmerDate;

    async function renderExpiringSoonCard() {
    try {
        const expiringProducts = await apiFetch('/dashboard/expiring-soon');
        
        expiringSoonListEl.innerHTML = ''; // Clear the "Loading..." message

        if (!expiringProducts || expiringProducts.length === 0) {
            // Use the translate function for the "no products" message
            expiringSoonListEl.innerHTML = `<li>${translate('product_expiring_soon.no_products')}</li>`;
            return;
        }

        expiringProducts.forEach(batch => {
            const li = document.createElement('li');
            li.className = 'list-item-expiring';

            // Use translate for fallback values
            const productName = batch.product ? batch.product.name_en : translate('unknown_product');
            const warehouseName = batch.warehouse ? batch.warehouse.name : translate('unknown_warehouse');

            // Calculate days remaining
            const expiryDate = new Date(batch.expiry_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const daysLeft = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
            
            // Determine the correct translation key and then translate
            let daysText;
            if (daysLeft <= 0) {
                daysText = translate('product_expiring_soon.expired');
            } else if (daysLeft === 1) {
                daysText = translate('product_expiring_soon.in_1_day');
            } else {
                daysText = translate('product_expiring_soon.in_days_plural', { count: daysLeft });
            }

            // Translate the complex "in warehouse" string with placeholders
            const itemDetails = translate('product_info.in_warehouse', {
                warehouseName: warehouseName,
                batchNumber: batch.batch_number || 'N/A'
            });

            li.innerHTML = `
                <div>
                    <span class="item-info">${batch.quantity} x ${productName}</span>
                    <span class="item-details">${itemDetails}</span>
                </div>
                <span class="days-left">${daysText}</span>
            `;
            expiringSoonListEl.appendChild(li);
        });

    } catch (error) {
        // Use the translate function for the error message
        expiringSoonListEl.innerHTML = `<li>${translate('error_loading_data')}</li>`;
        console.error("Error fetching expiring soon products:", error);
    }
}

    // --- 3. DATA FETCHING ---
    async function fetchDashboardData() {
        try {
            // Set initial loading states
            expiringSoonListEl.innerHTML = '<li>Loading...</li>';
            salesTodayEl.textContent = '...';
            salesMonthEl.textContent = '...';
            lowStockCountEl.textContent = '...';
            lowStockListEl.innerHTML = '<li>Loading...</li>';
            
            // Fetch the consolidated summary data from the backend
            const summary = await apiFetch('/dashboard/summary');
            
            renderExpiringSoonCard();
            // Populate the UI with the fetched data
            populateWidgets(summary);
            renderTopProductsChart(summary.top_selling_products);

        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            // Display an error message directly on the page
            document.querySelector('.main-content').innerHTML = `<div class="content-card"><p class="error-cell">Could not load dashboard data: ${error.message}</p></div>`;
        }
    }

    // --- 4. UI POPULATION ---
    function populateWidgets(data) {
        // Use the formatPrice helper for all currency values
        salesTodayEl.textContent = formatPrice(data.sales_today, 'THB');
        salesMonthEl.textContent = formatPrice(data.sales_this_month, 'THB');
        lowStockCountEl.textContent = data.low_stock_item_count;

        lowStockListEl.innerHTML = ''; // Clear loading message

        if (data.low_stock_items && data.low_stock_items.length > 0) {
            data.low_stock_items.forEach(item => {
                const li = document.createElement('li');
                
                // Use the translate function with a placeholder for the quantity
                const detailsText = translate('low_stock_item_details', { quantity: item.quantity });

                li.innerHTML = `${item.product_name} <span>${detailsText}</span>`;
                lowStockListEl.appendChild(li);
            });
        } else {
            // Use the translate function for the static "healthy" message
            lowStockListEl.innerHTML = `<li>${translate('all_stock_healthy')}</li>`;
        }
    }

    // --- 5. CHART RENDERING ---
    function renderTopProductsChart(products) {
        const chartContainer = document.querySelector('.chart-container');
        if (!products || products.length === 0) {
            // If there's no data, remove the canvas and show a message
            const canvas = document.getElementById('top-products-chart');
            if (canvas) canvas.style.display = 'none';
            chartContainer.innerHTML += '<p style="text-align:center; padding: 2rem;">No sales data available for the last 30 days.</p>';
            return;
        }

        // Use the column names from your SQL function's return TABLE
        const labels = products.map(p => p.product_name);
        const data = products.map(p => p.total_quantity_sold);

        new Chart(topProductsChartCanvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Units Sold',
                    data: data,
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y', // Horizontal bar chart is best for long product names
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0 // Show only whole numbers for units
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    // --- 6. INITIAL LOAD ---
    fetchDashboardData();
});