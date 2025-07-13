// frontend/admin/js/modules/warehouses.js
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. SETUP & SELECTIONS ---
    
    const user = getUser();
    let warehouseCache = [];

    const tableBody = document.getElementById('warehouses-table-body');
    const addWarehouseBtn = document.getElementById('add-warehouse-btn');
    const modal = document.getElementById('warehouse-modal');
    const modalTitle = document.getElementById('warehouse-modal-title');
    const form = document.getElementById('warehouse-form');
    const closeModalBtn = modal.querySelector('.close-btn');

    // --- 2. INITIAL SETUP ---
    document.getElementById('user-name').textContent = user ? user.fullName : 'Guest';
    document.getElementById('logout-btn').addEventListener('click', logout);

    // --- 3. DATA FETCHING & RENDERING ---
    async function fetchAndRenderWarehouses() {
        try {
            tableBody.innerHTML = `<tr><td colspan="4" class="loading-cell">Loading warehouses...</td></tr>`;
            const warehouses = await apiFetch('/warehouses');
            warehouseCache = warehouses || [];
            renderTable(warehouseCache);
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="4" class="error-cell">Error: ${error.message}</td></tr>`;
        }
    }

    function renderTable(warehouses) {
        tableBody.innerHTML = '';
        if (warehouses.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" class="loading-cell">No warehouses found. Add one to get started.</td></tr>`;
            return;
        }

        warehouses.forEach(w => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${w.name}</td>
                <td>${w.location || 'N/A'}</td>
                <td>${w.is_retail_location ? 'Yes' : 'No'}</td>
                <td>
                    <button class="btn btn-secondary btn-sm edit-btn" data-id="${w.id}">Edit</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    // --- 4. MODAL & FORM LOGIC ---
    function openModal(warehouse = null) {
        form.reset();
        document.getElementById('warehouse-id').value = '';

        if (warehouse) { // Editing
            modalTitle.textContent = 'Edit Warehouse';
            document.getElementById('warehouse-id').value = warehouse.id;
            document.getElementById('warehouse-name').value = warehouse.name;
            document.getElementById('warehouse-location').value = warehouse.location;
            document.getElementById('warehouse-is-retail').checked = warehouse.is_retail_location;
        } else { // Adding
            modalTitle.textContent = 'Add New Warehouse';
        }
        modal.style.display = 'block';
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        const warehouseId = document.getElementById('warehouse-id').value;
        const warehouseData = {
            name: document.getElementById('warehouse-name').value,
            location: document.getElementById('warehouse-location').value,
            is_retail_location: document.getElementById('warehouse-is-retail').checked
        };

        const method = warehouseId ? 'PUT' : 'POST';
        const endpoint = warehouseId ? `/warehouses/${warehouseId}` : '/warehouses';

        try {
            await apiFetch(endpoint, {
                method: method,
                body: JSON.stringify(warehouseData)
            });
            alert(`Warehouse ${warehouseId ? 'updated' : 'created'} successfully!`);
            modal.style.display = 'none';
            fetchAndRenderWarehouses(); // Refresh the data
        } catch (error) {
            alert(`Error saving warehouse: ${error.message}`);
        }
    }

    // --- 5. EVENT LISTENERS ---
    addWarehouseBtn.addEventListener('click', () => openModal());
    closeModalBtn.addEventListener('click', () => modal.style.display = 'none');
    form.addEventListener('submit', handleFormSubmit);

    tableBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('edit-btn')) {
            const warehouseId = e.target.dataset.id;
            const warehouseToEdit = warehouseCache.find(w => w.id === warehouseId);
            if (warehouseToEdit) {
                openModal(warehouseToEdit);
            }
        }
    });

    // --- 6. INITIAL LOAD ---
    fetchAndRenderWarehouses();
});