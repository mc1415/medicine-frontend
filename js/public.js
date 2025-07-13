// frontend/js/public.js
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. ELEMENT SELECTORS ---
    const productGrid = document.getElementById('public-product-grid');
    const categoryFilters = document.getElementById('category-filters');
    const searchInput = document.getElementById('public-search');
    const cardTemplate = document.getElementById('product-card-template');
    
    // Mobile Menu Logic (keeping this as it's unrelated to currency)
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileNavContainer = document.createElement('div');
    mobileNavContainer.className = 'mobile-nav-container';
    document.body.appendChild(mobileNavContainer);
    const allNavLinks = document.querySelectorAll('.main-nav a, .desktop-nav a');
    allNavLinks.forEach(link => {
        mobileNavContainer.appendChild(link.cloneNode(true));
    });
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileNavContainer.classList.toggle('is-open');
            mobileMenuBtn.classList.toggle('is-active');
        });
    }

    // --- 2. STATE & API CONFIG ---
    let productCache = [];
    let currentFilter = 'All';
    const API_URL = 'https://sokhaptaesterk-backend.onrender.com/api';

    // --- 3. CORE API FUNCTION ---
    async function fetchAndInitialize() {
        try {
            productGrid.innerHTML = '<p class="loading-message">Loading our finest products...</p>';
            
            const response = await fetch(`${API_URL}/products/public`);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            
            const products = await response.json();
            productCache = products;
            
            renderCategories();
            renderAllProducts();

        } catch (error) {
            console.error("Failed to initialize product page:", error);
            productGrid.innerHTML = '<p class="error-message">Sorry, we could not load our products at this time.</p>';
        }
    }

    // --- 4. RENDER FUNCTIONS ---

    function createProductCard(product) {
        const card = cardTemplate.content.cloneNode(true);
        const cardLink = card.querySelector('.product-card'); // Get the <a> tag
        cardLink.href = `product.html?id=${product.id}`;
        const stockStatusEl = card.querySelector('.stock-status');

        // --- THIS IS THE KEY FIX ---
        // Select the new span elements by their ID inside the cloned card
        const currentPriceEl = card.querySelector('.current-price');
    // Format the price using the helper, hardcoded to 'THB'
        currentPriceEl.textContent = formatPrice(product.selling_price, 'THB');
        
        card.querySelector('.card-image').src = product.image_url || 'https://via.placeholder.com/300x300.png?text=No+Image';
        card.querySelector('.product-name').textContent = product.name_en;
        card.querySelector('.product-category').textContent = product.category;

        // Stock status logic
        if (product.stock_level <= 0) {
            stockStatusEl.textContent = 'Out of Stock'; stockStatusEl.className = 'stock-status out-of-stock';
        } else if (product.stock_level < 10) {
            stockStatusEl.textContent = 'Limited Stock'; stockStatusEl.className = 'stock-status limited';
        } else {
            stockStatusEl.textContent = 'In Stock'; stockStatusEl.className = 'stock-status in-stock';
        }
        
        return card;
    }

    function renderAllProducts() {
        productGrid.innerHTML = '';
        const searchTerm = searchInput.value.toLowerCase();

        const filteredProducts = productCache.filter(product => {
            const matchesCategory = currentFilter === 'All' || product.category === currentFilter;
            const matchesSearch = product.name_en.toLowerCase().includes(searchTerm);
            return matchesCategory && matchesSearch;
        });

        if (filteredProducts.length === 0) {
            productGrid.innerHTML = '<p class="loading-message">No products match your search.</p>';
            return;
        }

        filteredProducts.forEach(product => {
            productGrid.appendChild(createProductCard(product));
        });
    }

    function renderCategories() {
        categoryFilters.innerHTML = '';
        const categories = ['All', ...new Set(productCache.map(p => p.category).filter(Boolean))];
        
        categories.forEach(category => {
            const button = document.createElement('button');
            button.className = 'filter-btn';
            button.textContent = category;
            button.dataset.category = category;
            if (category === 'All') button.classList.add('active');
            
            button.addEventListener('click', () => {
                const currentActiveBtn = categoryFilters.querySelector('.filter-btn.active');
                if (currentActiveBtn) currentActiveBtn.classList.remove('active');
                
                button.classList.add('active');
                currentFilter = category;
                renderAllProducts();
            });
            categoryFilters.appendChild(button);
        });
    }

    // --- 5. EVENT LISTENERS ---
    searchInput.addEventListener('input', renderAllProducts);
    // NOTE: We no longer need the 'currencyChanged' event listener.

    // --- 6. INITIAL LOAD ---
    fetchAndInitialize();
});
