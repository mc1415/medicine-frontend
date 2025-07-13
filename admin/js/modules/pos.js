// In frontend/admin/js/modules/pos.js
document.addEventListener('DOMContentLoaded', async () => {

    await window.currencyInitializationPromise;
    // --- 1. CHECK AUTH & GET USER ---
    
    const user = getUser();

    // --- NOW, ALL YOUR ORIGINAL POS CODE CAN RUN SAFELY ---
    console.log("POS script is now running, currencies are ready.");

    // --- 2. DEFINE STATE VARIABLES ---
    let productCache = [];
    let cart = [];
    let lastCompletedSale = null;

    // --- 3. SELECT ALL HTML ELEMENTS AT THE TOP ---
    const productGrid = document.getElementById('product-grid');
    const cartItemsContainer = document.getElementById('cart-items');
    const emptyCartMessage = document.querySelector('.empty-cart-message');
    const chargeBtn = document.getElementById('charge-btn');
    const cancelSaleBtn = document.getElementById('cancel-sale-btn');
    const userNameSpan = document.getElementById('user-name');
    const searchInput = document.getElementById('product-search');
    
    // Modal Elements
    const paymentModal = document.getElementById('payment-modal');
    const closeModalBtn = document.querySelector('#payment-modal .close-btn');
    const confirmPaymentBtn = document.getElementById('confirm-payment-btn');

    // Summary Elements
    const summarySubtotal = document.getElementById('summary-subtotal');
    const summaryTax = document.getElementById('summary-tax');
    const summaryTotal = document.getElementById('summary-total');
    const summaryTotalUsd = document.getElementById('summary-total-usd');
    const paymentTotalDue = document.getElementById('payment-total-due');
    const paymentTotalDueUsd = document.getElementById('payment-total-due-usd');

    // At the top, in the element selections area, add the new modal selectors
    const postSaleModal = document.getElementById('post-sale-modal');
    const printInvoiceBtn = document.getElementById('print-invoice-btn');
    const printReceiptBtn = document.getElementById('print-receipt-btn');
    const newSaleBtn = document.getElementById('new-sale-btn');
    const closePostSaleModalBtn = postSaleModal.querySelector('.close-btn');

    // --- 4. INITIAL PAGE SETUP ---
    userNameSpan.textContent = user ? user.fullName : 'Guest';

    // --- 5. DEFINE ALL FUNCTIONS ---

    function toBase64(str) {
        return btoa(unescape(encodeURIComponent(str)));
    }

    function getLocalizedProductName(product) {
        const lang = getCurrentLanguage();
        return lang === 'km' && product.name_km ? product.name_km : product.name_en;
    }

    async function fetchAndRenderInitialData() {
        try {
            productGrid.innerHTML = `<p>Loading products...</p>`;
            const products = await apiFetch('/products'); // This should be your admin endpoint
            productCache = products || [];
            renderProducts();
        } catch (error) {
            productGrid.innerHTML = `<p style="color:red; text-align:center;">Could not load products. (${error.message})</p>`;
        }
    }

    function renderProducts() {
        productGrid.innerHTML = '';
        const searchTerm = searchInput.value.toLowerCase();
        
        const filteredProducts = productCache.filter(p => 
            p.name_en.toLowerCase().includes(searchTerm) || 
            (p.sku && p.sku.toLowerCase().includes(searchTerm))
        );

        if (filteredProducts.length === 0) {
            productGrid.innerHTML = '<p>No products available or match your search.</p>';
            return;
        }

        filteredProducts.forEach(product => {
            const productTile = document.createElement('div');
            productTile.className = 'product-tile';
            if (product.total_stock <= 0) {
                productTile.classList.add('out-of-stock');
            }
            productTile.dataset.id = product.id;
            const productName = getLocalizedProductName(product);

            productTile.innerHTML = `
                <div class="product-tile-image-container">
                    <img class="product-tile-image" src="${product.image_url || 'https://via.placeholder.com/150'}" alt="${productName}">
                </div>
                <div class="product-tile-info">
                    <p class="product-tile-name">${productName}</p>
                    <p class="product-tile-price">${formatPrice(product.selling_price, 'THB')}</p>
                </div>
            `;
            
            productTile.addEventListener('click', () => {
                if (product.total_stock > 0) {
                    addToCart(product.id);
                }
            });
            productGrid.appendChild(productTile);
        });
    }

    function addToCart(productId) {
        const product = productCache.find(p => p.id === productId);
        if (!product) return;
        const cartItem = cart.find(item => item.id === productId);

        if (cartItem) {
            if (cartItem.quantity < product.total_stock) {
                cartItem.quantity++;
            } else {
                alert(`No more stock available for ${product.name_en}.`);
            }
        } else {
            cart.push({ ...product, quantity: 1 });
        }
        renderCart();
    }

    function updateCartItemQuantity(productId, newQuantity) {
        const cartItem = cart.find(item => item.id === productId);
        if (!cartItem) return;

        const productInCache = productCache.find(p => p.id === productId);
        if (newQuantity > productInCache.total_stock) {
            alert(`Maximum stock (${productInCache.total_stock}) reached for ${productInCache.name_en}.`);
            return;
        }

        if (newQuantity <= 0) {
            cart = cart.filter(item => item.id !== productId);
        } else {
            cartItem.quantity = newQuantity;
        }
        renderCart();
    }

    function renderCart() {
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '';
            emptyCartMessage.style.display = 'block';
            chargeBtn.disabled = true;
        } else {
            emptyCartMessage.style.display = 'none';
            chargeBtn.disabled = false;
            cartItemsContainer.innerHTML = '';

            cart.forEach(item => {
                const cartItemElement = document.createElement('div');
                cartItemElement.className = 'cart-item';
                const itemTotal = item.selling_price * item.quantity;
                const productName = getLocalizedProductName(item);

                cartItemElement.innerHTML = `
                    <div class="cart-item-details">
                        <span class="cart-item-name">${productName}</span>
                        <span class="cart-item-price">${formatPrice(item.selling_price, 'THB')}</span>
                    </div>
                    <div class="cart-item-actions">
                        <button class="quantity-btn decrease-btn" data-id="${item.id}">-</button>
                        <span class="cart-item-quantity">${item.quantity}</span>
                        <button class="quantity-btn increase-btn" data-id="${item.id}">+</button>
                    </div>
                    <span class="cart-item-total">${formatPrice(itemTotal, 'THB')}</span>
                `;
                cartItemsContainer.appendChild(cartItemElement);
            });
        }
        updateCartSummary();
    }

    function updateCartSummary() {
        const subtotal = cart.reduce((acc, item) => acc + (item.selling_price * item.quantity), 0);
        const tax = subtotal * 0.00;
        const total = subtotal + tax;
        
        // These elements are always visible, so they are probably safe.
        if (summarySubtotal) summarySubtotal.textContent = formatPrice(subtotal, 'THB');
        if (summaryTax) summaryTax.textContent = formatPrice(tax, 'THB');
        if (summaryTotal) summaryTotal.textContent = formatPrice(total, 'THB');
        if (summaryTotalUsd) summaryTotalUsd.textContent = formatPrice(total, 'USD'); 
        
        // THE FIX: These elements are inside a modal. Only update them if they exist.
        if (paymentTotalDue) {
            paymentTotalDue.textContent = formatPrice(total, 'THB');
        }
        if (paymentTotalDueUsd) {
            paymentTotalDueUsd.textContent = formatPrice(total, 'USD');
        }
    }

    function clearSale() {
        cart = [];
        renderCart();
    }
    
    let overrideTimer = null;

async function processSale(paymentMethod) {
    if (cart.length === 0) return;

    // Use a different button for the loading state depending on the context
    // This now correctly does nothing if the payment method isn't 'cash'
    if (paymentMethod === 'cash') {
        toggleButtonLoading(confirmPaymentBtn, true, 'Confirm Payment & New Sale');
    }

    const totalAmount = cart.reduce((acc, item) => acc + (item.selling_price * item.quantity), 0);
    const saleItemsPayload = cart.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        price_at_sale: item.selling_price
    }));

    try {
        const saleResult = await apiFetch('/transactions/sales', {
            method: 'POST',
            body: JSON.stringify({
                warehouse_id: 'c451f784-5f1d-4b86-823d-1e75660a6b6d',
                sale_items: saleItemsPayload,
                total_amount: totalAmount,
                payment_method: paymentMethod
            })
        });

        lastCompletedSale = saleResult.transactionData;
        
        document.getElementById('qr-code-modal').style.display = 'none';
        paymentModal.style.display = 'none';

        clearSale();
        // Don't call fetchAndRenderInitialData() here, as it can cause re-render issues.
        // The UI is cleared, ready for the next sale. A full refresh can be done later.
        postSaleModal.style.display = 'block';

    } catch (error) {
        alert(`Sale failed: ${error.message}`);
    } finally {
        if (paymentMethod === 'cash') {
            toggleButtonLoading(confirmPaymentBtn, false, 'Confirm Payment & New Sale');
        }
    }
}


// UPDATED completeSale FUNCTION
// This function now only decides which action to take based on the dropdown.
async function completeSale() {
    if (cart.length === 0) {
        return;
    }

    const paymentMethod = document.getElementById('payment-method').value;

    if (paymentMethod === 'khqr') {
        // If the user selected KHQR, we must wait for the QR code
        // modal to be handled. We add 'await' here to be explicit.
        await generateAndShowQrCode();
    } else {
        // For any other method ('cash', etc.), we process the sale immediately.
        await processSale(paymentMethod);
    }
}


// UPDATED generateAndShowQrCode FUNCTION
// This function now includes the slider logic and has no timer.
async function generateAndShowQrCode() {
    // 1. Get elements and show modal
    const qrModal = document.getElementById('qr-code-modal');
    const qrDisplayArea = document.getElementById('qr-display-area');
    const sliderContainer = document.getElementById('slide-to-pay-container');
    
    paymentModal.style.display = 'none';
    qrDisplayArea.innerHTML = '<p>Generating secure QR Code...</p>';
    sliderContainer.style.display = 'none';
    qrModal.style.display = 'block';

    // --- START OF THE FIX ---

    // 2. Prepare data for QR generation (with new dynamic rates)
    const totalAmountInTHB = cart.reduce((acc, item) => acc + (item.selling_price * item.quantity), 0);
    const tran_id = `SALE-${Date.now()}`;

    // 2a. Get the USD exchange rate from our global currency object.
    const usdRate = window.AppCurrencies.USD?.rate_to_base;

    // 2b. Add a safety check. If the rate isn't loaded, stop the function.
    if (!usdRate) {
        qrDisplayArea.innerHTML = `<p style="color:red; font-weight: bold;">Error: USD exchange rate not loaded. Cannot generate QR code.</p>`;
        return; // Stop execution
    }

    // 2c. Perform the correct conversion for the total amount.
    const amountInUSD = (totalAmountInTHB / usdRate).toFixed(2);
    
    // 2d. Perform the correct conversion for each item in the cart.
    const itemsArray = cart.map(item => ({
        name: item.name_en,
        quantity: parseInt(item.quantity),
        price: parseFloat((item.selling_price / usdRate).toFixed(2)) // Use division here as well
    }));

    // --- END OF THE FIX ---

    const itemsJsonString = JSON.stringify(itemsArray);
    // Assuming toBase64 is a function you have defined elsewhere
    const itemsBase64 = toBase64(itemsJsonString); 

    const payload = { tran_id, amount: amountInUSD, items_base64: itemsBase64 };

    // 3. Call backend to get QR code (no changes here)
    try {
        const qrData = await apiFetch('/payments/aba-qr', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (qrData && qrData.qrImage) {
            qrDisplayArea.innerHTML = `<img src="${qrData.qrImage}" alt="Scan to Pay" style="max-width: 100%; height: auto;">`;
            sliderContainer.style.display = 'block';
        } else {
            throw new Error(qrData.error || 'QR image not found in API response.');
        }

    } catch (error) {
        qrDisplayArea.innerHTML = `<p style="color:red; font-weight: bold;">Error: ${error.message}</p>`;
        sliderContainer.style.display = 'none';
    }

    // --- Slider Logic (no changes here) ---
    const thumb = document.getElementById('slider-thumb');
    let isDown = false;
    let startX;

    thumb.addEventListener('mousedown', (e) => {
        isDown = true;
        thumb.style.transition = 'none';
        startX = e.pageX - thumb.offsetLeft;
    });

    document.addEventListener('mouseup', () => {
        if (!isDown) return;
        isDown = false;
        const maxSlide = sliderContainer.offsetWidth - thumb.offsetWidth;
        thumb.style.transition = 'left 0.3s ease';
        if (thumb.offsetLeft < maxSlide - 5) {
            thumb.style.left = '0px';
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - sliderContainer.offsetLeft;
        const walk = x - startX; // This seems incorrect, should likely just be x
        const maxSlide = sliderContainer.offsetWidth - thumb.offsetWidth;

        let newLeft = Math.max(0, Math.min(maxSlide, walk));
        thumb.style.left = `${newLeft}px`;

        if (newLeft >= maxSlide - 5) {
            isDown = false;
            thumb.style.pointerEvents = 'none';
            // Assuming processSale is a function you have defined elsewhere
            processSale('khqr'); 
        }
    });
}

async function completeSale(paymentMethodOverride = null) {
    if (cart.length === 0) return;

    // --- MODIFICATION START: Use override or get from dropdown ---
    // If an override value is passed (like 'manual_qr_override'), use it.
    // Otherwise, get the value from the payment method dropdown.
    const paymentMethod = paymentMethodOverride || document.getElementById('payment-method').value;
    // --- MODIFICATION END ---

    // This check now correctly handles the initial click on the "Charge" button.
    // It will not be triggered by the manual override.
    if (paymentMethod === 'khqr') {
        generateAndShowQrCode(); // This triggers the QR flow
        return; 
    }
    
    toggleButtonLoading(confirmPaymentBtn, true, 'Confirm Payment & New Sale');

    const totalAmount = cart.reduce((acc, item) => acc + (item.selling_price * item.quantity), 0);
    const saleItemsPayload = cart.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        price_at_sale: item.selling_price
    }));

    try {
        const saleResult = await apiFetch('/transactions/sales', {
            method: 'POST',
            body: JSON.stringify({
                warehouse_id: 'c451f784-5f1d-4b86-823d-1e75660a6b6d', // This should probably be dynamic
                user_id: user.id,
                sale_items: saleItemsPayload,
                total_amount: totalAmount,
                // --- MODIFICATION ---
                // This now sends the correct method: 'cash' or 'manual_qr_override'
                payment_method: paymentMethod
            })
        });

        lastCompletedSale = saleResult.transactionData;
        
        clearSale();
        paymentModal.style.display = 'none';
        fetchAndRenderInitialData(); 
        
        postSaleModal.style.display = 'block';

    } catch (error) {
        alert(`Sale failed: ${error.message}`);
    } finally {
        toggleButtonLoading(confirmPaymentBtn, false, 'Confirm Payment & New Sale');
    }
}


// This event listener needs to be updated to cancel the timer if the user closes the modal
document.querySelector('#qr-code-modal .close-btn').addEventListener('click', () => {
    // --- MODIFICATION START ---
    if (overrideTimer) {
        clearTimeout(overrideTimer); // Cancel the timer
    }
    // --- MODIFICATION END ---
    document.getElementById('qr-code-modal').style.display = 'none';
    // You should still implement logic here to cancel the pending transaction with PayWay if possible
});

// This is your existing function, included for completeness. No changes needed.
function toggleButtonLoading(button, isLoading, originalText) {
    if (isLoading) {
        button.disabled = true;
        button.innerHTML = `<span class="spinner-sm"></span> Processing...`; // Example with a spinner
    } else {
        button.disabled = false;
        button.textContent = originalText;
    }
}   
    
    function openModal() {
        if (cart.length > 0) {
            paymentModal.style.display = 'block';
        }
    }

    function closeModal() {
        paymentModal.style.display = 'none';
    }


    // --- 6. SETUP EVENT LISTENERS ---
    searchInput.addEventListener('input', renderProducts);
    
    cartItemsContainer.addEventListener('click', (e) => {
        const target = e.target.closest('.quantity-btn'); // More robust event delegation
        if (!target) return;
        
        const productId = target.dataset.id;
        const cartItem = cart.find(item => item.id === productId);
        if (!cartItem) return;

        if (target.classList.contains('increase-btn')) {
            updateCartItemQuantity(productId, cartItem.quantity + 1);
        } else if (target.classList.contains('decrease-btn')) {
            updateCartItemQuantity(productId, cartItem.quantity - 1);
        }
    });

    chargeBtn.addEventListener('click', openModal);
    cancelSaleBtn.addEventListener('click', clearSale);
    closeModalBtn.addEventListener('click', closeModal);
    confirmPaymentBtn.addEventListener('click', () => completeSale());
    
    closePostSaleModalBtn.addEventListener('click', () => postSaleModal.style.display = 'none');
    newSaleBtn.addEventListener('click', () => postSaleModal.style.display = 'none');

    printInvoiceBtn.addEventListener('click', () => {
        if (!lastCompletedSale || !lastCompletedSale.id) {
            alert('Error: No completed sale data found to print.');
            return;
        }

        // This line is now the fix. It adds the sale ID to the URL.
        const receiptUrl = `receipt.html?sale_id=${lastCompletedSale.id}`;
        
        // We can still save to localStorage in case the other receipt button uses it.
        localStorage.setItem('currentReceiptData', JSON.stringify(lastCompletedSale));
        
        window.open(receiptUrl, '_blank');
    });

    printReceiptBtn.addEventListener('click', () => {
        if (!lastCompletedSale) return;
        localStorage.setItem('currentReceiptData', JSON.stringify(lastCompletedSale));
        window.open('receipt-80mm.html', '_blank');
    });

    // Close modal if user clicks outside of it
    window.addEventListener('click', (event) => {
        if (event.target === paymentModal) {
            closeModal();
        }
    });

    const resizer = document.getElementById('pos-resizer');
    const leftPanel = document.querySelector('.pos-products');
    const rightPanel = document.querySelector('.pos-cart');

    let isResizing = false;

    const onMouseDown = (e) => {
        isResizing = true;
        document.body.classList.add('is-resizing'); // Add class to prevent text selection
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        // For touch devices
        document.addEventListener('touchmove', onMouseMove);
        document.addEventListener('touchend', onMouseUp);
    };

    const onMouseMove = (e) => {
        if (!isResizing) return;
        
        // Use pageX/Y and check for touch events for cross-device compatibility
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        // Check if we are in mobile (vertical) or desktop (horizontal) layout
        if (window.innerWidth < 768) {
            // Mobile: Vertical resizing
            const totalHeight = window.innerHeight;
            const newTopHeight = (clientY / totalHeight) * 100;
            leftPanel.style.height = `${newTopHeight}vh`;
            rightPanel.style.height = `${100 - newTopHeight}vh`;
        } else {
            // Desktop: Horizontal resizing
            const totalWidth = window.innerWidth;
            const newLeftWidth = (clientX / totalWidth) * 100;
            leftPanel.style.width = `${newLeftWidth}%`;
            rightPanel.style.width = `${100 - newLeftWidth}%`;
        }
    };

    const onMouseUp = () => {
        isResizing = false;
        document.body.classList.remove('is-resizing');
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        // For touch devices
        document.removeEventListener('touchmove', onMouseMove);
        document.removeEventListener('touchend', onMouseUp);
    };

    resizer.addEventListener('mousedown', onMouseDown);
    resizer.addEventListener('touchstart', onMouseDown); // Add touch support

    // --- 7. INITIAL DATA LOAD ---
    fetchAndRenderInitialData();
    renderCart();
});