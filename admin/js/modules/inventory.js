// frontend/admin/js/modules/inventory.js
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. SETUP & GLOBAL SELECTIONS ---
    
    const user = getUser();
    let productCache = [];
    let warehousesCache = []; // To store warehouse list for modals

    // Page Elements
    const tableBody = document.getElementById('inventory-table-body');
    const addProductBtn = document.getElementById('add-product-btn');
    const searchInput = document.getElementById('stock-filter-input');

    // Product Modal Elements
    const productModal = document.getElementById('product-modal');
    const productModalTitle = document.getElementById('product-modal-title');
    const productForm = document.getElementById('product-form');
    const closeProductModalBtn = productModal.querySelector('.close-btn');

    const imageFileInput = document.getElementById('product-image-file');
    const imagePreview = document.getElementById('image-preview');

    const removeImageBtn = document.getElementById('remove-image-btn');

    // --- 2. INITIAL PAGE SETUP ---
    document.getElementById('user-name').textContent = user ? user.fullName : 'Guest';
    document.getElementById('logout-btn').addEventListener('click', logout);

    imageFileInput.addEventListener('change', () => {
        const file = imageFileInput.files[0];
        if (file) {
            // Use FileReader to read the file and create a temporary local URL
            const reader = new FileReader();
            reader.onload = (e) => {
                // Set the preview image source and make it visible
                imagePreview.src = e.target.result;
                imagePreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });

    // --- 3. CORE DATA FETCHING ---
    async function fetchInitialData() {
        try {
            tableBody.innerHTML = `<tr><td colspan="6" class="loading-cell">Loading inventory...</td></tr>`;
            // Fetch products and warehouses in parallel for better performance
            const [products, warehouses] = await Promise.all([
                apiFetch('/products'),
                apiFetch('/warehouses') // Assumes a GET /api/warehouses endpoint exists
            ]);
            
            productCache = products || [];
            warehousesCache = warehouses || [];
            
            renderInventoryTable(productCache);
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="6" class="error-cell">Error loading inventory: ${error.message}</td></tr>`;
        }
    }

    function getLocalizedProductName(product) {
        const lang = getCurrentLanguage(); // from i18n.js
        // If language is Khmer and name_km exists, use it. Otherwise, default to English.
        return lang === 'km' && product.name_km ? product.name_km : product.name_en;
    }
    
    // --- 4. RENDERING & MODAL LOGIC ---
    function renderInventoryTable(products) {
        tableBody.innerHTML = '';
        // Get the current search term from the input field
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

        // Filter the master productCache based on the search term
        const filteredProducts = productCache.filter(product => {
            // Check if name_en exists and includes the search term
            const nameEnMatch = product.name_en && product.name_en.toLowerCase().includes(searchTerm);

            // Check if name_km exists and includes the search term
            // We don't use .toLowerCase() for Khmer as it's not always applicable or necessary
            const nameKmMatch = product.name_km && product.name_km.includes(searchTerm);

            // Check if sku exists and includes the search term
            const skuMatch = product.sku && product.sku.toLowerCase().includes(searchTerm);

            // Return true if ANY of the conditions match
            return nameEnMatch || nameKmMatch || skuMatch;
        });

        if (filteredProducts.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" class="loading-cell">No products match your search.</td></tr>`;
            return;
        }

        // Sort the filtered products alphabetically
        filteredProducts.sort((a, b) => a.name_en.localeCompare(b.name_en));

        filteredProducts.forEach(product => {
            const row = document.createElement('tr');
            const stock = product.total_stock;
            let stockClass = '';
            if (!product.is_active) stockClass = 'inactive';
            else if (stock <= 0) stockClass = 'out';
            else if (stock < product.reorder_point) stockClass = 'low';

            // Add a class to the row if the product is inactive
            if (!product.is_active) row.classList.add('inactive-row');

            const productName = getLocalizedProductName(product);

            row.innerHTML = `
                <td data-label="SKU">${product.sku}</td>
                <td data-label="Product Name">${productName}</td>
                <td data-label="Category">${product.category}</td>
                <td data-label="Price">${formatPrice(product.selling_price, 'USD')}</td>
                <td data-label="Stock"><span class="stock-level ${stockClass}">${stock}</span></td>
                <td>
                    <button class="btn btn-secondary btn-sm edit-btn" data-id="${product.id}">Edit</button>
                    <button class="btn btn-danger btn-sm delete-btn" data-id="${product.id}">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    // --- Product Modal Logic ---
    function openProductModal(product = null) {
        // 1. Reset the form to its default state.
        productForm.reset(); 

        // 2. Specifically reset the file input and our custom 'removed' flag.
        imageFileInput.value = ''; 
        delete imagePreview.dataset.imageRemoved;

        // 3. Set the default placeholder image. The CSS will automatically show the icon/prompt.
        imagePreview.src = '../assets/placeholder.png'; // Make sure this path is correct

        // 4. Set the default state for the 'is_active' checkbox.
        document.getElementById('product-is-active').checked = true;

        if (product) {
            // --- WE ARE EDITING AN EXISTING PRODUCT ---
            productModalTitle.textContent = 'Edit Product';

            // Populate all form fields with the existing product's data
            document.getElementById('product-id').value = product.id;
            document.getElementById('product-name-en').value = product.name_en;
            document.getElementById('product-name-km').value = product.name_km || '';
            document.getElementById('product-sku').value = product.sku;
            document.getElementById('product-category').value = product.category;
            document.getElementById('product-selling-price').value = product.selling_price;
            document.getElementById('product-purchase-price').value = product.purchase_price || 0;
            document.getElementById('product-reorder-point').value = product.reorder_point || 10;
            document.getElementById('product-description').value = product.description || '';
            document.getElementById('product-is-active').checked = product.is_active;

            // If the product has a real image URL, update the preview.
            // The CSS will automatically hide the prompt and show the image.
            if (product.image_url) {
                imagePreview.src = product.image_url;
            }

        } else {
            // --- WE ARE ADDING A NEW PRODUCT ---
            productModalTitle.textContent = 'Add New Product';
            // Ensure the hidden ID field is empty
            document.getElementById('product-id').value = '';
            // The image preview will correctly show the placeholder by default.
        }

        // 5. Finally, display the fully prepared modal.
        productModal.style.display = 'block';
    }

    // --- Adjustment Modal Logic ---
    function openAdjustmentModal() {
        const productSelect = document.getElementById('adjustment-product');
        const warehouseSelect = document.getElementById('adjustment-warehouse');
        
        // Populate products dropdown
        productSelect.innerHTML = '<option value="" disabled selected>Select a product...</option>';
        productCache.forEach(p => {
            productSelect.innerHTML += `<option value="${p.id}">${p.name_en} (SKU: ${p.sku})</option>`;
        });

        // Populate warehouses dropdown
        warehouseSelect.innerHTML = '<option value="" disabled selected>Select a warehouse...</option>';
        warehousesCache.forEach(w => {
            warehouseSelect.innerHTML += `<option value="${w.id}">${w.name}</option>`;
        });

        adjustmentForm.reset();
        adjustmentModal.style.display = 'block';
    }

    // --- 5. EVENT HANDLERS (API Calls) ---
    
    // Handles submission for both Adding and Editing products
    async function handleProductFormSubmit(e) {
        e.preventDefault();
        const saveBtn = document.getElementById('save-product-btn');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        // --- 1. GATHER INITIAL DATA ---
        const productId = document.getElementById('product-id').value;
        const file = imageFileInput.files[0];
        const imageWasRemoved = imagePreview.dataset.imageRemoved === 'true';

        // Clean up the 'removed' flag immediately after reading it
        delete imagePreview.dataset.imageRemoved;

        try {
            // Get the full existing product object to access its old image URL
            const existingProduct = productId ? productCache.find(p => p.id === productId) : null;
            const oldImageUrl = existingProduct ? existingProduct.image_url : null;
            let finalImageUrl = oldImageUrl; // Start by assuming the URL won't change

            // --- 2. HANDLE IMAGE LOGIC ---
            if (file) {
                // --- UPLOAD NEW IMAGE ---
                saveBtn.textContent = 'Uploading Image...';

                const fileExt = file.name.split('.').pop();
                const fileName = `public/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
                
                const { error: uploadError } = await supabase.storage
                    .from('product-images')
                    .upload(fileName, file);

                if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);

                const { data: urlData } = supabase.storage
                    .from('product-images')
                    .getPublicUrl(fileName);
                
                finalImageUrl = urlData.publicUrl; // This is our new URL

            } else if (imageWasRemoved) {
                // --- REMOVE EXISTING IMAGE ---
                finalImageUrl = null; // Set the URL to null in the database
            }

            // --- 3. PREPARE FINAL PRODUCT DATA ---
            const productData = {
                name_en: document.getElementById('product-name-en').value,
                name_km: document.getElementById('product-name-km').value,
                sku: document.getElementById('product-sku').value,
                category: document.getElementById('product-category').value,
                selling_price: parseFloat(document.getElementById('product-selling-price').value),
                purchase_price: parseFloat(document.getElementById('product-purchase-price').value) || 0,
                reorder_point: parseInt(document.getElementById('product-reorder-point').value) || 10,
                description: document.getElementById('product-description').value,
                is_active: document.getElementById('product-is-active').checked,
                image_url: finalImageUrl, // Use the final calculated URL
            };

            // --- 4. SAVE PRODUCT DATA TO DATABASE ---
            saveBtn.textContent = 'Saving Product Data...';
            const method = productId ? 'PUT' : 'POST';
            const endpoint = productId ? `/products/${productId}` : '/products';

            await apiFetch(endpoint, {
                method: method,
                body: JSON.stringify(productData)
            });

            // --- 5. CLEAN UP OLD IMAGE FROM STORAGE ---
            // This should happen only if we have a new URL or the URL was set to null,
            // and there was a different, valid old URL to begin with.
            if (oldImageUrl && oldImageUrl !== finalImageUrl) {
                console.log("Removing old image from storage:", oldImageUrl);
                // Extract the file path from the full URL to pass to the remove function
                const oldImageFilePath = new URL(oldImageUrl).pathname.split('/product-images/').pop();
                
                await supabase.storage
                    .from('product-images')
                    .remove([oldImageFilePath]);
            }

            // --- 6. FINISH UP ---
            alert(`Product ${productId ? 'updated' : 'added'} successfully!`);
            productModal.style.display = 'none';
            fetchInitialData(); // Refresh the main inventory table

        } catch (error) {
            console.error("Error saving product:", error);
            alert(`Error: ${error.message}`);
        } finally {
            // Always re-enable the button
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Product';
        }
    }

    // Handles submission for stock adjustments
    async function handleStockAdjustment(e) {
        e.preventDefault();
        let quantity = parseInt(document.getElementById('adjustment-quantity').value);
        if (document.getElementById('adjustment-type').value.includes('out')) {
            quantity = -Math.abs(quantity); // Ensure quantity is negative for stock out
        }

        const adjustmentData = {
            product_id: document.getElementById('adjustment-product').value,
            warehouse_id: document.getElementById('adjustment-warehouse').value,
            adjustment_quantity: quantity,
            reason: document.getElementById('adjustment-type').value,
            notes: document.getElementById('adjustment-notes').value
        };
        
        try {
            await apiFetch('/transactions/stock', {
                method: 'POST',
                body: JSON.stringify(adjustmentData)
            });
            alert('Stock adjusted successfully!');
            adjustmentModal.style.display = 'none';
            fetchInitialData(); // Refresh the table
        } catch (error) {
            alert(`Failed to adjust stock: ${error.message}`);
        }
    }

    // --- 6. ATTACH EVENT LISTENERS ---

    // Main page buttons
    addProductBtn.addEventListener('click', () => openProductModal());

    // Modal close buttons
    closeProductModalBtn.addEventListener('click', () => productModal.style.display = 'none');
    
    // Form submission listeners
    productForm.addEventListener('submit', handleProductFormSubmit);
    
    // Event delegation for dynamically created Edit and Delete buttons
    tableBody.addEventListener('click', async (e) => {
        const target = e.target;
        const productId = target.dataset.id;

        if (target.classList.contains('edit-btn')) {
            const productToEdit = productCache.find(p => p.id === productId);
            if (productToEdit) {
                openProductModal(productToEdit);
            }
        }

        if (target.classList.contains('delete-btn')) {
            const product = productCache.find(p => p.id === productId);
            if (confirm(`Are you sure you want to delete "${product.name_en}"? This action will deactivate the product.`)) {
                try {
                    await apiFetch(`/products/${productId}`, { method: 'DELETE' });
                    alert('Product deactivated successfully.');
                    fetchInitialData(); // Refresh table
                } catch (error) {
                    alert(`Failed to delete product: ${error.message}`);
                }
            }
        }
    });
    
    if (searchInput) {
        searchInput.addEventListener('input', renderInventoryTable);
    }

    // --- 7. INITIAL DATA LOAD ---
    fetchInitialData();
});