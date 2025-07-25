// Configuração da API
const API_BASE = 'https://stellaxsec.onrender.com/api'; // URL do backend no Render

// Estado da aplicação
let products = [];
let cart = [];
let currentFilter = 'all';

// Carregar produtos ao inicializar
document.addEventListener('DOMContentLoaded', function() {
    loadProducts();
    loadCartFromStorage();
    updateCartUI();
    
    // Mobile menu toggle
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }
});

// Carregar produtos da API
async function loadProducts() {
    const container = document.getElementById('productsContainer');
    container.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i><p>Carregando produtos...</p></div>';
    
    try {
        const response = await fetch(`${API_BASE}/products`);
        const data = await response.json();
        
        if (data.success) {
            products = data.products;
            renderProducts();
        } else {
            container.innerHTML = '<div class="alert alert-error">Erro ao carregar produtos.</div>';
        }
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        container.innerHTML = '<div class="alert alert-error">Erro ao conectar com o servidor.</div>';
    }
}

// Renderizar produtos
function renderProducts() {
    const container = document.getElementById('productsContainer');
    
    // Filtrar produtos
    let filteredProducts = products;
    if (currentFilter !== 'all') {
        filteredProducts = products.filter(product => product.category === currentFilter);
    }
    
    if (filteredProducts.length === 0) {
        container.innerHTML = '<div class="alert alert-error">Nenhum produto encontrado.</div>';
        return;
    }
    
    const html = `
        <div class="products-grid">
            ${filteredProducts.map(product => `
                <div class="product-card" data-category="${product.category}">
                    <div class="product-image">
                        ${product.image_url ? 
                            `<img src="${product.image_url}" alt="${product.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                             <div style="display:none; flex-direction:column; align-items:center; justify-content:center; height:100%; color:white;">
                                <i class="fas fa-${getCategoryIcon(product.category)}"></i>
                             </div>` :
                            `<i class="fas fa-${getCategoryIcon(product.category)}"></i>`
                        }
                        <span class="product-category">${product.category}</span>
                    </div>
                    <div class="product-info">
                        <h3>${product.name}</h3>
                        <p>${product.description}</p>
                        <div class="product-features">
                            ${product.is_digital ? '<div class="feature"><i class="fas fa-download"></i> Download imediato</div>' : ''}
                            ${product.download_limit > 0 ? `<div class="feature"><i class="fas fa-sync"></i> ${product.download_limit} downloads</div>` : ''}
                            <div class="feature"><i class="fas fa-shield-check"></i> Pagamento seguro</div>
                            <div class="feature"><i class="fas fa-headset"></i> Suporte incluído</div>
                        </div>
                        <div class="product-price">R$ ${product.price.toFixed(2)}</div>
                        <button class="add-to-cart" onclick="addToCart(${product.id})">
                            <i class="fas fa-cart-plus"></i> Adicionar ao Carrinho
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    container.innerHTML = html;
}

// Obter ícone da categoria
function getCategoryIcon(category) {
    const icons = {
        'Cursos': 'graduation-cap',
        'E-books': 'book',
        'Ferramentas': 'tools',
        'Consultoria': 'user-tie'
    };
    return icons[category] || 'box';
}

// Filtrar produtos
function filterProducts(category) {
    currentFilter = category;
    
    // Atualizar botões de filtro
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    renderProducts();
}

// Adicionar ao carrinho
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    // Verificar se já está no carrinho
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        showAlert('Produto já está no carrinho!', 'error');
        return;
    }
    
    cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        category: product.category
    });
    
    saveCartToStorage();
    updateCartUI();
    showAlert('Produto adicionado ao carrinho!', 'success');
}

// Remover do carrinho
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCartToStorage();
    updateCartUI();
}

// Atualizar interface do carrinho
function updateCartUI() {
    const cartCount = document.getElementById('cartCount');
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    const checkoutBtn = document.getElementById('checkoutBtn');
    
    // Atualizar contador
    cartCount.textContent = cart.length;
    
    // Atualizar itens
    if (cart.length === 0) {
        cartItems.innerHTML = '<p class="empty-cart">Seu carrinho está vazio</p>';
        cartTotal.textContent = '0.00';
        checkoutBtn.disabled = true;
    } else {
        const total = cart.reduce((sum, item) => sum + item.price, 0);
        
        cartItems.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <div class="cart-item-price">R$ ${item.price.toFixed(2)}</div>
                </div>
                <button class="remove-item" onclick="removeFromCart(${item.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
        
        cartTotal.textContent = total.toFixed(2);
        checkoutBtn.disabled = false;
    }
}

// Salvar carrinho no localStorage
function saveCartToStorage() {
    localStorage.setItem('stellaxsec_cart', JSON.stringify(cart));
}

// Carregar carrinho do localStorage
function loadCartFromStorage() {
    const savedCart = localStorage.getItem('stellaxsec_cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
    }
}

// Toggle carrinho
function toggleCart() {
    const cartSidebar = document.getElementById('cartSidebar');
    const overlay = document.getElementById('overlay');
    
    cartSidebar.classList.toggle('open');
    overlay.classList.toggle('show');
}

// Checkout
function checkout() {
    if (cart.length === 0) return;
    
    const modal = document.getElementById('checkoutModal');
    const overlay = document.getElementById('overlay');
    const orderItems = document.getElementById('orderItems');
    const orderTotal = document.getElementById('orderTotal');
    
    // Preencher resumo do pedido
    const total = cart.reduce((sum, item) => sum + item.price, 0);
    
    orderItems.innerHTML = cart.map(item => `
        <div class="order-item">
            <span>${item.name}</span>
            <span>R$ ${item.price.toFixed(2)}</span>
        </div>
    `).join('');
    
    orderTotal.textContent = total.toFixed(2);
    
    // Mostrar modal
    modal.classList.add('show');
    overlay.classList.add('show');
    
    // Fechar carrinho
    document.getElementById('cartSidebar').classList.remove('open');
}

// Fechar modal de checkout
function closeCheckoutModal() {
    const modal = document.getElementById('checkoutModal');
    const overlay = document.getElementById('overlay');
    
    modal.classList.remove('show');
    overlay.classList.remove('show');
}

// Processar checkout
document.getElementById('checkoutForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const customerName = document.getElementById('customerName').value;
    const customerEmail = document.getElementById('customerEmail').value;
    const alertDiv = document.getElementById('checkoutAlert');
    
    if (!customerName || !customerEmail) {
        showAlert('Por favor, preencha todos os campos.', 'error', alertDiv);
        return;
    }
    
    // Preparar dados do pedido
    const orderData = {
        customer_name: customerName,
        customer_email: customerEmail,
        items: cart.map(item => ({
            product_id: item.id,
            quantity: 1
        }))
    };
    
    try {
        // Mostrar loading
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
        submitBtn.disabled = true;
        
        const response = await fetch(`${API_BASE}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Fechar modal de checkout
            closeCheckoutModal();
            
            // Mostrar modal PIX
            showPixModal(data.order, data.payment);
            
            // Limpar carrinho
            cart = [];
            saveCartToStorage();
            updateCartUI();
            
        } else {
            showAlert(data.message, 'error', alertDiv);
        }
        
        // Restaurar botão
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        
    } catch (error) {
        console.error('Erro no checkout:', error);
        showAlert('Erro ao processar pedido. Tente novamente.', 'error', alertDiv);
        
        // Restaurar botão
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-qrcode"></i> Gerar PIX';
        submitBtn.disabled = false;
    }
});

// Mostrar modal PIX
function showPixModal(order, payment) {
    const modal = document.getElementById('pixModal');
    const overlay = document.getElementById('overlay');
    const pixAmount = document.getElementById('pixAmount');
    const pixKey = document.getElementById('pixKey');
    const pixQrCode = document.getElementById('pixQrCode');
    
    // Preencher dados do PIX
    pixAmount.textContent = order.total_amount.toFixed(2);
    
    if (payment && payment.pix_key) {
        pixKey.value = payment.pix_key;
        
        // Se houver QR Code, mostrar
        if (payment.qr_code) {
            pixQrCode.innerHTML = `<img src="${payment.qr_code}" alt="QR Code PIX" style="width: 100%; height: 100%; object-fit: contain;">`;
        }
    } else {
        // Fallback - gerar chave PIX simulada
        pixKey.value = `00020126580014BR.GOV.BCB.PIX0136${order.id}-stellaxsec-${Date.now()}5204000053039865802BR5913StellaxSec6009SAO PAULO62070503***6304`;
    }
    
    // Mostrar modal
    modal.classList.add('show');
    overlay.classList.add('show');
    
    // Simular verificação de pagamento (em produção, seria via webhook)
    setTimeout(() => {
        checkPaymentStatus(order.id);
    }, 30000); // Verificar após 30 segundos
}

// Fechar modal PIX
function closePixModal() {
    const modal = document.getElementById('pixModal');
    const overlay = document.getElementById('overlay');
    
    modal.classList.remove('show');
    overlay.classList.remove('show');
}

// Copiar chave PIX
function copyPixKey() {
    const pixKey = document.getElementById('pixKey');
    pixKey.select();
    document.execCommand('copy');
    
    // Feedback visual
    const copyBtn = event.target;
    const originalText = copyBtn.innerHTML;
    copyBtn.innerHTML = '<i class="fas fa-check"></i> Copiado!';
    copyBtn.style.background = '#4ade80';
    
    setTimeout(() => {
        copyBtn.innerHTML = originalText;
        copyBtn.style.background = '#00d4ff';
    }, 2000);
}

// Verificar status do pagamento
async function checkPaymentStatus(orderId) {
    try {
        const response = await fetch(`${API_BASE}/orders/${orderId}`);
        const data = await response.json();
        
        if (data.success && data.order.status === 'paid') {
            // Pagamento confirmado
            const statusDiv = document.querySelector('.payment-status');
            statusDiv.innerHTML = `
                <div style="color: #4ade80; text-align: center;">
                    <i class="fas fa-check-circle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <h3>Pagamento Confirmado!</h3>
                    <p>Seu pedido foi processado com sucesso.</p>
                    <p>Você receberá os links de download por email.</p>
                </div>
            `;
            
            // Fechar modal após alguns segundos
            setTimeout(() => {
                closePixModal();
                showAlert('Pagamento confirmado! Verifique seu email.', 'success');
            }, 5000);
        } else {
            // Continuar verificando
            setTimeout(() => {
                checkPaymentStatus(orderId);
            }, 10000);
        }
    } catch (error) {
        console.error('Erro ao verificar pagamento:', error);
        // Continuar verificando
        setTimeout(() => {
            checkPaymentStatus(orderId);
        }, 10000);
    }
}

// Função auxiliar para mostrar alertas
function showAlert(message, type, container = null) {
    const alertClass = type === 'success' ? 'alert-success' : 'alert-error';
    const alertHtml = `<div class="alert ${alertClass}">${message}</div>`;
    
    if (container) {
        container.innerHTML = alertHtml;
        setTimeout(() => {
            container.innerHTML = '';
        }, 5000);
    } else {
        // Criar alerta flutuante
        const alertDiv = document.createElement('div');
        alertDiv.innerHTML = alertHtml;
        alertDiv.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            z-index: 9999;
            max-width: 300px;
        `;
        
        document.body.appendChild(alertDiv);
        
        setTimeout(() => {
            document.body.removeChild(alertDiv);
        }, 5000);
    }
}

// Fechar modais ao clicar no overlay
document.getElementById('overlay').addEventListener('click', function() {
    closeCheckoutModal();
    closePixModal();
    toggleCart();
});

// Smooth scrolling para links internos
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

