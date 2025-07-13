console.log("--- product-detail.js script is running. ---");

let currentProduct = null;

document.addEventListener('DOMContentLoaded', () => {
    
    console.log("--- DOM is ready. Starting product detail logic. ---");

    const detailContainer = document.getElementById('product-detail-container');
    const detailTemplate = document.getElementById('product-detail-template');
    const API_URL = 'https://sokhaptaesterk-backend.onrender.com/api';
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        console.error("HALT: No product ID in URL.");
        detailContainer.innerHTML = '<p class="loading-message">No product specified.</p>';
        return;
    }

    async function fetchAndRenderProduct() {
        console.log(`Fetching product with ID: ${productId}`);
        try {
            const response = await fetch(`${API_URL}/products/${productId}`);
            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            
            const product = await response.json();
            console.log("Successfully fetched product data:", product);
            renderProductDetails(product);

        } catch (error) {
            console.error("Failed to load product details from API.", error);
        }
    }

    function renderProductDetails(product) {
        console.log("renderProductDetails has been called. Now creating the content.");
        currentProduct = product;
        detailContainer.innerHTML = '';
        const detailView = detailTemplate.content.cloneNode(true);
        
        // Your rendering logic (this part is correct)
        detailView.querySelector('#detail-image').src = product.image_url || 'https://via.placeholder.com/500';
        detailView.querySelector('#detail-name-en').textContent = product.name_en;
        detailView.querySelector('#detail-name-km').textContent = product.name_km;
        detailView.querySelector('#detail-category').textContent = product.category;
        const currency = 'THB';
        detailView.querySelector('#detail-price').textContent = new Intl.NumberFormat('th-TH', { style: 'currency', currency: currency }).format(product.selling_price);
        detailView.querySelector('#detail-description').textContent = product.description || 'No description available for this product.';
        // etc...

        // This adds the content (including the button) to the live page
        detailContainer.appendChild(detailView);
        console.log("Content appended to page. Now finding the button.");

        // =========================================================
        // === THIS IS THE FIX: Find the button AFTER it's been created ===
        // =========================================================
        const addToCartBtn = document.getElementById('add-to-cart-btn');
        const quantityInput = document.getElementById('quantity-input');
        
        if (addToCartBtn) {
            console.log("SUCCESS: Found the 'Add to Cart' button. Attaching listener.");
            
            addToCartBtn.addEventListener('click', () => {
                console.log("--- CLICKED! ---");
                const quantity = parseInt(quantityInput.value, 10);
                addToCart(currentProduct, quantity);
                Toastify({
                    text: `${quantity} x ${currentProduct.name_en} added to cart!`,
                    duration: 3000, // 3 seconds
                    close: true,
                    gravity: "top", // `top` or `bottom`
                    position: "right", // `left`, `center` or `right`
                    stopOnFocus: true, // Prevents dismissing of toast on hover
                    style: {
                    background: "linear-gradient(to right, #00b09b, #96c93d)",
                    },
                    onClick: function(){} // Callback after click
                }).showToast();
            });
        } else {
            console.error("CRITICAL FAILURE: Could NOT find 'add-to-cart-btn' even after rendering.");
        }
    }

    // Start the process
    fetchAndRenderProduct();
});
