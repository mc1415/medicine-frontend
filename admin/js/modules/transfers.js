// frontend/admin/js/modules/transfers.js
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. SETUP & SELECTIONS ---
    
    const user = getUser();
    let warehousesCache = [];
    let productsCache = [];

    // Form Elements
    const fromWarehouseSelect = document.getElementById('from-warehouse');
    const toWarehouseSelect = document.getElementById('to-warehouse');
    const transferItemList = document.getElementById('transfer-item-list');
    const addItemBtn = document.getElementById('add-item-btn');
    const submitTransferBtn = document.getElementById('submit-transfer-btn');
    const transferNotesInput = document.getElementById('transfer-notes');
    
    // History Table
    const historyTableBody = document.getElementById('transfer-history-body');

    // --- 2. INITIAL DATA FETCH ---
    async function fetchInitialData() {
        try {
            const [warehouses, products] = await Promise.all([
                apiFetch('/warehouses'),
                apiFetch('/products')
            ]);
            warehousesCache = warehouses || [];
            productsCache = products || [];

            populateWarehouseSelects();
            fetchAndRenderHistory();
        } catch (error) {
            alert(`Failed to load initial data: ${error.message}`);
        }
    }

    function getLocalizedProductName(product) {
        const lang = getCurrentLanguage();
        // Use name_km if lang is Khmer AND it exists, otherwise use name_en
        return lang === 'km' && product.name_km ? product.name_km : product.name_en;
    }


    // --- 3. UI RENDERING & DYNAMIC FORM ---
    function populateWarehouseSelects() {
        fromWarehouseSelect.innerHTML = `<option value="">${i18n_translations.select_source || 'Select source...'}</option>`;
        toWarehouseSelect.innerHTML = `<option value="">${i18n_translations.select_destination || 'Select destination...'}</option>`;
        warehousesCache.forEach(w => {
            const option = `<option value="${w.id}">${w.name}</option>`;
            fromWarehouseSelect.innerHTML += option;
            toWarehouseSelect.innerHTML += option;
        });
    }

    function createTransferItemRow() {
        const rowId = `item-${Date.now()}`;
        const row = document.createElement('div');
        row.className = 'transfer-item-row';
        row.id = rowId;

        let productOptions = '<option value="">Select product...</option>';
        productsCache.forEach(p => {
            productOptions += `<option value="${p.id}">${p.name_en}</option>`;
        });

        row.innerHTML = `
            <select class="product-select" required>${productOptions}</select>
            <input type="number" class="quantity-input" placeholder="Qty" min="1" required>
            <button class="btn btn-danger btn-sm remove-item-btn" data-row-id="${rowId}">Remove</button>
        `;
        transferItemList.appendChild(row);
    }

    async function fetchAndRenderHistory() {
        try {
            historyTableBody.innerHTML = `<tr><td colspan="5" class="loading-cell">Loading history...</td></tr>`;
            const history = await apiFetch('/transfers');
            
            historyTableBody.innerHTML = '';
            if (history.length === 0) {
                historyTableBody.innerHTML = `<tr><td colspan="5" class="loading-cell">No transfers found.</td></tr>`;
                return;
            }
            
            history.forEach(t => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${new Date(t.transfer_date).toLocaleString()}</td>
                    <td>${t.from_warehouse.name}</td>
                    <td>${t.to_warehouse.name}</td>
                    <td><span class="status-badge ${t.status}">${t.status}</span></td>
                    <td>${t.initiator.full_name}</td>
                `;
                historyTableBody.appendChild(row);
            });
        } catch (error) {
            historyTableBody.innerHTML = `<tr><td colspan="5" class="error-cell">Error: ${error.message}</td></tr>`;
        }
    }

    // --- 4. EVENT HANDLERS ---
    addItemBtn.addEventListener('click', createTransferItemRow);

    transferItemList.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-item-btn')) {
            const rowId = e.target.dataset.rowId;
            document.getElementById(rowId).remove();
        }
    });

    submitTransferBtn.addEventListener('click', async () => {
        const from_warehouse_id = fromWarehouseSelect.value;
        const to_warehouse_id = toWarehouseSelect.value;
        
        if (!from_warehouse_id || !to_warehouse_id || from_warehouse_id === to_warehouse_id) {
            alert('Please select valid and different source and destination warehouses.');
            return;
        }

        const items = [];
        const itemRows = transferItemList.querySelectorAll('.transfer-item-row');
        if (itemRows.length === 0) {
            alert('Please add at least one item to transfer.');
            return;
        }

        let isValid = true;
        itemRows.forEach(row => {
            const product_id = row.querySelector('.product-select').value;
            const quantity = parseInt(row.querySelector('.quantity-input').value);
            if (!product_id || !quantity || quantity <= 0) {
                isValid = false;
            }
            items.push({ product_id, quantity });
        });

        if (!isValid) {
            alert('Please ensure all items have a selected product and a valid quantity.');
            return;
        }

        const transferData = {
            from_warehouse_id,
            to_warehouse_id,
            items,
            notes: transferNotesInput.value
        };

        if (!confirm('Are you sure you want to complete this transfer? This action cannot be undone.')) {
            return;
        }

        try {
            await apiFetch('/transfers', {
                method: 'POST',
                body: JSON.stringify(transferData)
            });
            alert('Transfer completed successfully!');
            // Reset form
            transferItemList.innerHTML = '';
            document.getElementById('transfer-form').reset();
            // Refresh history
            fetchAndRenderHistory();
        } catch (error) {
            alert(`Transfer failed: ${error.message}`);
        }
    });

    // --- 5. INITIAL LOAD ---
    document.getElementById('user-name').textContent = user ? user.fullName : 'Guest';
    document.getElementById('logout-btn').addEventListener('click', logout);
    fetchInitialData();
    
});