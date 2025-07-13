// A set of functions to manage the shopping cart using localStorage.

const CART_KEY = 'spt_cart';

// Function to get the cart from localStorage
function getCart() {
    const cartJson = localStorage.getItem(CART_KEY);
    return cartJson ? JSON.parse(cartJson) : [];
}

// Function to save the cart to localStorage
function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

// Function to add an item to the cart
function addToCart(product, quantity = 1) {
    const cart = getCart();
    const productId = product.id;

    // Check if the item already exists in the cart
    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        // If it exists, just update the quantity
        existingItem.quantity += quantity;
    } else {
        // If it's a new item, add it to the cart
        cart.push({
            id: product.id,
            name_en: product.name_en,
            name_km: product.name_km,
            selling_price: product.selling_price,
            image_url: product.image_url,
            quantity: quantity,
        });
    }

    saveCart(cart);
    updateCartIcon(); // We'll create this function next
}

// Function to remove an item from the cart
function removeFromCart(productId) {
    let cart = getCart();
    cart = cart.filter(item => item.id !== productId);
    saveCart(cart);
    updateCartIcon();
}

// Function to clear the entire cart
function clearCart() {
    localStorage.removeItem(CART_KEY);
    updateCartIcon();
}

// Function to update the cart icon badge (will be implemented in the main UI script)
// This is a placeholder that will be defined in another file.
function updateCartIcon() {
    const cart = getCart();
    const cartIcon = document.getElementById('cart-icon-badge');
    if (cartIcon) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        if (totalItems > 0) {
            cartIcon.textContent = totalItems;
            cartIcon.style.display = 'flex';
        } else {
            cartIcon.style.display = 'none';
        }
    }
}