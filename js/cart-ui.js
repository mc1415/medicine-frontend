document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENT SELECTORS ---
    const cartIcon = document.getElementById('cart-icon');
    const modal = document.getElementById('cart-modal');
    const closeBtn = document.getElementById('close-cart-btn');
    const itemsContainer = document.getElementById('cart-items-container');
    const totalPriceEl = document.getElementById('cart-total-price');
    const orderForm = document.getElementById('order-form');
    const itemTemplate = document.getElementById('cart-item-template');

    // --- RENDER FUNCTION ---
    function renderCart() {
        const cart = getCart();
        itemsContainer.innerHTML = ''; // Clear previous content

        if (cart.length === 0) {
            itemsContainer.innerHTML = '<p>Your cart is empty.</p>';
            totalPriceEl.textContent = '0.00 ฿';
            return;
        }

        let totalPrice = 0;
        cart.forEach(item => {
            const itemNode = itemTemplate.content.cloneNode(true);
            const itemTotalPrice = item.selling_price * item.quantity;
            totalPrice += itemTotalPrice;

            itemNode.querySelector('.cart-item-image').src = item.image_url || 'https://via.placeholder.com/50';
            itemNode.querySelector('.cart-item-name').textContent = item.name_en;
            itemNode.querySelector('.cart-item-price').textContent = `${itemTotalPrice.toLocaleString()} ฿`;
            itemNode.querySelector('.cart-item-quantity').value = item.quantity;

            // Add event listener for removing the item
            itemNode.querySelector('.cart-item-remove-btn').addEventListener('click', () => {
                removeFromCart(item.id);
                renderCart(); // Re-render the cart to show the change
            });
            
            itemsContainer.appendChild(itemNode);
        });

        totalPriceEl.textContent = `${totalPrice.toLocaleString()} ฿`;
    }
    
    // --- EVENT LISTENERS ---
    cartIcon.addEventListener('click', () => {
        renderCart();
        modal.style.display = 'flex';
    });

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    orderForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const placeOrderBtn = document.getElementById('place-order-btn');
        placeOrderBtn.disabled = true;
        placeOrderBtn.textContent = 'Placing Order...';

        const customer = {
            name: document.getElementById('customer-name').value,
            phone: document.getElementById('customer-phone').value,
        };
        
        const orderData = {
            items: getCart(),
            customer: customer
        };
        
        try {
            const response = await fetch('https://sokhaptaesterk-backend.onrender.com/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData),
            });
            
            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'Failed to place order.');
            }
            
            const result = await response.json();
            Toastify({
              text: result.message,
              duration: 5000, // 5 seconds
              gravity: "top",
              position: "center",
              style: {
                  background: "linear-gradient(to right, #2ecc71, #27ae60)", // Green success gradient
                  fontSize: "1.1rem",
              },
          }).showToast();
            
            clearCart();
            modal.style.display = 'none';
            orderForm.reset();

        } catch (error) {
            alert(`Error: ${error.message}`);
        } finally {
            placeOrderBtn.disabled = false;
            placeOrderBtn.textContent = 'Place Order';
        }
    });

    // --- INITIAL LOAD ---
    updateCartIcon(); // Update icon on every page load
});
