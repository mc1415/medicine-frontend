document.addEventListener('DOMContentLoaded', () => {

    // --- 1. SETUP & SELECTIONS ---
    const user = getUser();
    let productsInventoryCache = []; // Cache for product data with inventory
    let warehousesCache = [];      // Cache for warehouse data

    const tableHead = document.getElementById('stock-levels-head');
    const tableBody = document.getElementById('stock-levels-body');
    const searchInput = document.getElementById('stock-filter-input');
    const purchaseInBtn = document.getElementById('purchase-in-btn');
    const purchaseModal = document.getElementById('purchase-modal');
    const purchaseForm = document.getElementById('purchase-form');
    const closePurchaseModalBtn = purchaseModal.querySelector('.close-btn');
    const purchaseProductInput = document.getElementById('purchase-product-search');
    const purchaseProductOptions = document.getElementById('purchase-product-options');
    const purchaseProductHidden = document.getElementById('purchase-product');
    const purchaseBarcodeBtn = document.getElementById('purchase-barcode-btn');
    const purchaseQuantityInput = document.getElementById('purchase-quantity');
    let purchaseIsBarcodeMode = false;
    const defaultPurchasePlaceholder = purchaseProductInput ? purchaseProductInput.placeholder : '';

    // --- 2. INITIAL SETUP ---
    document.getElementById('user-name').textContent = user ? user.fullName : 'Guest';
    document.getElementById('logout-btn').addEventListener('click', logout);

    // --- 3. DATA FETCHING ---
    async function fetchAndRenderData() {
        try {
            tableBody.innerHTML = `<tr><td colspan="5" class="loading-cell">Loading...</td></tr>`;
            
            const [warehouses, productsInventory] = await Promise.all([
                apiFetch('/warehouses'),
                apiFetch('/products/detailed-inventory')
            ]);

            console.log("Warehouses from API:", warehouses);
            console.log("Products/Inventory from API:", productsInventory);
            
            warehousesCache = warehouses || [];
            productsInventoryCache = productsInventory || [];

            renderTable(); // Call the main render function
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="5" class="error-cell">Error: ${error.message}</td></tr>`;
        }
    }

    // --- 4. RENDERING (This is the original logic) ---
    function renderTable() {
        renderHeader();
        renderBody();
        // This will now only affect the static headers like "Product Name", "SKU", etc.
        if (typeof applyTranslations === 'function') {
            applyTranslations();
        }
    }
    function renderHeader() {
        tableHead.innerHTML = '';
        const headerRow = document.createElement('tr');
        
        // We will build the final HTML string directly.
        
        // 1. Define the static headers. We use data-i18n-key for these.
        let headerHTML = `
            <th data-i18n-key="th_product_name_stock">Product Name</th>
            <th data-i18n-key="th_sku_stock">SKU</th>
        `;
        
        // 2. Get the translated prefix for the dynamic columns.
        // This assumes you have added the getTranslation() helper to your i18n.js file.
        // If not, it will gracefully fall back to "Stock:".
        const stockPrefix = (typeof getTranslation === 'function') 
            ? getTranslation('th_stock_prefix', 'Stock:') 
            : 'Stock:';

        // 3. Loop through warehouses and build the dynamic header columns.
        warehousesCache.forEach(w => {
            // Combine the translated prefix with the warehouse name.
            // NO data-i18n-key here!
            headerHTML += `<th>${stockPrefix} ${w.name}</th>`;
        });
        
        // 4. Add the final static column.
        headerHTML += `<th data-i18n-key="th_total_stock">Total Stock</th>`;

        // 5. Set the complete, final HTML for the header row.
        headerRow.innerHTML = headerHTML;
        tableHead.appendChild(headerRow);
    }

    function renderBody() {
        tableBody.innerHTML = '';
        const searchTerm = searchInput.value.toLowerCase();

        const filteredProducts = productsInventoryCache.filter(p => 
            p.name_en.toLowerCase().includes(searchTerm) || 
            (p.sku && p.sku.toLowerCase().includes(searchTerm))
        );

        if (filteredProducts.length === 0) {
            const colCount = warehousesCache.length + 3;
            tableBody.innerHTML = `<tr><td colspan="${colCount}" class="loading-cell">No products match.</td></tr>`;
            return;
        }

        filteredProducts.sort((a,b) => a.name_en.localeCompare(b.name_en));

        filteredProducts.forEach(product => {
            const row = document.createElement('tr');
            let rowHTML = `<td>${product.name_en}</td><td>${product.sku || 'N/A'}</td>`;
            
            let totalStock = 0;
            // Create a map of warehouse ID to total quantity for THIS product
            const inventoryMap = new Map();
            product.inventory.forEach(batch => {
                const warehouseId = batch.warehouse.id;
                const currentQty = inventoryMap.get(warehouseId) || 0;
                inventoryMap.set(warehouseId, currentQty + batch.quantity);
            });

            // Loop through the master list of warehouses to maintain column order
            warehousesCache.forEach(warehouse => {
                const quantity = inventoryMap.get(warehouse.id) || 0;
                rowHTML += `<td>${quantity}</td>`;
                totalStock += quantity;
            });

            rowHTML += `<td><strong>${totalStock}</strong></td>`;
            row.innerHTML = rowHTML;
            tableBody.appendChild(row);
        });
    }

    // --- 5. MODAL & SUBMISSION LOGIC (Updated for Expiry) ---
    function openPurchaseModal() {
        const warehouseSelect = document.getElementById('purchase-warehouse');

        purchaseForm.reset();
        purchaseProductInput.value = '';
        purchaseProductHidden.value = '';
        purchaseProductInput.placeholder = defaultPurchasePlaceholder;
        purchaseIsBarcodeMode = false;

        purchaseProductOptions.innerHTML = '';
        productsInventoryCache.forEach(p => {
            const option = document.createElement('option');
            option.value = `${p.name_en} (SKU: ${p.sku || 'N/A'})`;
            option.dataset.id = p.id;
            if (p.barcode) option.dataset.barcode = p.barcode;
            purchaseProductOptions.appendChild(option);
        });

        warehouseSelect.innerHTML = '<option value="" disabled selected>Select receiving warehouse...</option>';
        warehousesCache.forEach(w => {
            warehouseSelect.innerHTML += `<option value="${w.id}">${w.name}</option>`;
        });

        purchaseModal.style.display = 'block';
    }

    async function handlePurchaseSubmit(e) {
        e.preventDefault();
        const purchaseData = {
            product_id: document.getElementById('purchase-product').value,
            warehouse_id: document.getElementById('purchase-warehouse').value,
            quantity: parseInt(document.getElementById('purchase-quantity').value),
            cost: parseFloat(document.getElementById('purchase-cost').value) || null,
            notes: document.getElementById('purchase-notes').value,
            // Include expiry and batch data from the modal
            expiry_date: document.getElementById('purchase-expiry-date')?.value || null,
            batch_number: document.getElementById('purchase-batch-number')?.value || null
        };
        
        if (!purchaseData.product_id || !purchaseData.warehouse_id || !purchaseData.quantity) {
            return alert('Please fill all required fields.');
        }

        try {
            await apiFetch('/transactions/purchase', { // Assuming you have a route for this
                method: 'POST',
                body: JSON.stringify(purchaseData),
            });
            alert('Stock purchased successfully!');
            purchaseModal.style.display = 'none';
            fetchAndRenderData(); // Refresh the table
        } catch(error) {
            alert(`Error recording purchase: ${error.message}`);
        }
    }

    // --- 6. EVENT LISTENERS ---
    searchInput.addEventListener('input', renderBody);
    purchaseInBtn.addEventListener('click', openPurchaseModal);
    closePurchaseModalBtn.addEventListener('click', () => purchaseModal.style.display = 'none');
    purchaseForm.addEventListener('submit', handlePurchaseSubmit);
    purchaseBarcodeBtn.addEventListener('click', () => {
        if (purchaseIsBarcodeMode) {
            purchaseIsBarcodeMode = false;
            purchaseProductInput.value = '';
            purchaseProductInput.placeholder = defaultPurchasePlaceholder;
        } else {
            purchaseIsBarcodeMode = true;
            purchaseProductInput.value = '';
            purchaseProductInput.placeholder = 'Scan or enter barcode';
            purchaseProductInput.focus();
        }
    });
    purchaseProductInput.addEventListener('change', () => {
        const val = purchaseProductInput.value;
        const option = Array.from(purchaseProductOptions.options).find(o => o.value === val);
        purchaseProductHidden.value = option ? option.dataset.id : '';
    });
    purchaseProductInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (purchaseIsBarcodeMode) {
                const code = purchaseProductInput.value.trim();
                const product = productsInventoryCache.find(p => (p.barcode && p.barcode === code) || (p.sku && p.sku === code));
                if (product) {
                    purchaseProductHidden.value = product.id;
                    purchaseProductInput.value = `${product.name_en} (SKU: ${product.sku || 'N/A'})`;
                    purchaseQuantityInput.focus();
                }
                purchaseProductInput.placeholder = defaultPurchasePlaceholder;
                purchaseIsBarcodeMode = false;
            } else {
                const val = purchaseProductInput.value;
                const option = Array.from(purchaseProductOptions.options).find(o => o.value === val);
                if (option) {
                    purchaseProductHidden.value = option.dataset.id;
                    purchaseQuantityInput.focus();
                }
            }
        }
    });

    // --- 7. INITIAL LOAD ---
    fetchAndRenderData();
});
