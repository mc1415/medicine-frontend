// public/admin/js/modules/low_stock.js
document.addEventListener('DOMContentLoaded', () => {
    

    // --- Global Selections & Setup ---
    const user = getUser();
    const tableBody = document.getElementById('low-stock-table-body');
    document.getElementById('user-name').textContent = user ? user.fullName : 'Guest';
    document.getElementById('logout-btn').addEventListener('click', logout);
    
    // --- Main Render Function ---
    function renderLowStockTable() {
        tableBody.innerHTML = '';
        
        // Filter mockProducts to find items that are low in stock
        const lowStockItems = mockProducts.filter(p => p.quantity > 0 && p.quantity <= 100);

        if (lowStockItems.length === 0) {
            const row = tableBody.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 5;
            cell.textContent = 'No items are currently low on stock. Great job!';
            cell.style.textAlign = 'center';
            cell.style.padding = '2rem';
        } else {
            lowStockItems.forEach(product => {
                const row = document.createElement('tr');
                
                row.innerHTML = `
                    <td>${product.sku}</td>
                    <td>${product.name_en}</td>
                    <td>${product.category}</td>
                    <td><span class="stock-level low">${product.quantity}</span></td>
                    <td>Needs Reordering</td>
                `;
                tableBody.appendChild(row);
            });
        }
    }

    // --- Initial Load ---
    renderLowStockTable();
});