// frontend/admin/js/modules/staff.js
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. SETUP & SELECTIONS ---
    
    const currentUser = getUser();
    let staffCache = [];

    const tableBody = document.getElementById('staff-table-body');
    const addStaffBtn = document.getElementById('add-staff-btn');
    
    const modal = document.getElementById('staff-modal');
    const modalTitle = document.getElementById('staff-modal-title');
    const form = document.getElementById('staff-form');
    const closeModalBtn = modal.querySelector('.close-btn');

    // --- 2. INITIAL SETUP ---
    document.getElementById('user-name').textContent = currentUser ? currentUser.fullName : 'Guest';
    document.getElementById('logout-btn').addEventListener('click', logout);

    // --- 3. DATA FETCHING & RENDERING ---
    async function fetchAndRenderStaff() {
        try {
            tableBody.innerHTML = `<tr><td colspan="5" class="loading-cell">Loading staff...</td></tr>`;
            const staffList = await apiFetch('/auth/staff');
            staffCache = staffList || [];
            renderTable(staffCache);
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="5" class="error-cell">Error: ${error.message}</td></tr>`;
        }
    }

    function renderTable(staffList) {
        tableBody.innerHTML = '';
        if (staffList.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="loading-cell">No staff members found.</td></tr>`;
            return;
        }
        staffList.forEach(staff => {
            const row = document.createElement('tr');
            const statusClass = staff.is_active ? 'status-active' : 'status-inactive';
            
            row.innerHTML = `
                <td>${staff.full_name}</td>
                <td>${staff.email}</td>
                <td>${staff.role}</td>
                <td><span class="status-badge ${statusClass}">${staff.is_active ? 'Active' : 'Inactive'}</span></td>
                <td>
                    <button class="btn btn-secondary btn-sm edit-btn" data-id="${staff.id}">Edit</button>
                    <button class="btn btn-danger btn-sm delete-btn" data-id="${staff.id}" ${currentUser.id === staff.id ? 'disabled' : ''}>Deactivate</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    // --- 4. MODAL & FORM LOGIC ---
    function openModal(staff = null) {
        form.reset();
        document.getElementById('staff-is-active').checked = true;
        
        if (staff) { // Editing
            modalTitle.textContent = 'Edit Staff Member';
            document.getElementById('staff-id').value = staff.id;
            document.getElementById('staff-full-name').value = staff.full_name;
            document.getElementById('staff-email').value = staff.email;
            document.getElementById('staff-role').value = staff.role;
            document.getElementById('staff-is-active').checked = staff.is_active;
            // Clear password and set placeholder for editing
            document.getElementById('staff-password').placeholder = "Leave blank to keep unchanged";
            document.getElementById('staff-password').required = false;
        } else { // Adding
            modalTitle.textContent = 'Add New Staff';
            document.getElementById('staff-id').value = '';
            document.getElementById('staff-password').placeholder = "";
            document.getElementById('staff-password').required = true;
        }
        modal.style.display = 'block';
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        const staffId = document.getElementById('staff-id').value;
        const password = document.getElementById('staff-password').value;

        const staffData = {
            full_name: document.getElementById('staff-full-name').value,
            email: document.getElementById('staff-email').value,
            role: document.getElementById('staff-role').value,
            is_active: document.getElementById('staff-is-active').checked
        };
        
        // Only include the password if the user typed one
        if (password) {
            staffData.password = password;
        }

        const method = staffId ? 'PUT' : 'POST';
        const endpoint = staffId ? `/auth/staff/${staffId}` : '/auth/staff';
        
        try {
            await apiFetch(endpoint, {
                method: method,
                body: JSON.stringify(staffData)
            });
            alert(`Staff member ${staffId ? 'updated' : 'created'} successfully!`);
            modal.style.display = 'none';
            fetchAndRenderStaff();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    }

    // --- 5. EVENT LISTENERS ---
    addStaffBtn.addEventListener('click', () => openModal());
    closeModalBtn.addEventListener('click', () => modal.style.display = 'none');
    form.addEventListener('submit', handleFormSubmit);
    
    tableBody.addEventListener('click', async (e) => {
        const target = e.target;
        const id = target.dataset.id;

        if (target.classList.contains('edit-btn')) {
            const staffToEdit = staffCache.find(s => s.id === id);
            if (staffToEdit) openModal(staffToEdit);
        }

        if (target.classList.contains('delete-btn')) {
            const staffToDelete = staffCache.find(s => s.id === id);
            if (confirm(`Are you sure you want to deactivate ${staffToDelete.full_name}?`)) {
                try {
                    await apiFetch(`/auth/staff/${id}`, { method: 'DELETE' });
                    alert('Staff member deactivated.');
                    fetchAndRenderStaff();
                } catch (error) {
                    alert(`Error: ${error.message}`);
                }
            }
        }
    });

    // --- 6. INITIAL LOAD ---
    fetchAndRenderStaff();
});