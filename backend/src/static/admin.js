// Configuração da API
const API_BASE = window.location.origin + '/api';

// Estado da aplicação
let currentUser = null;
let products = [];
let orders = [];
let stats = {};

// Verificar se já está logado ao carregar a página
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
});

// Verificar status de autenticação
async function checkAuthStatus() {
    try {
        const response = await fetch(`${API_BASE}/admin/status`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success && data.admin.logged_in) {
            currentUser = data.admin;
            showAdminPanel();
            loadDashboard();
        } else {
            showLoginForm();
        }
    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        showLoginForm();
    }
}

// Mostrar formulário de login
function showLoginForm() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('adminPanel').style.display = 'none';
}

// Mostrar painel administrativo
function showAdminPanel() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
}

// Função de login
async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const alertDiv = document.getElementById('loginAlert');
    
    if (!username || !password) {
        showAlert(alertDiv, 'Por favor, preencha todos os campos.', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/admin/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.admin;
            showAdminPanel();
            loadDashboard();
            showAlert(alertDiv, 'Login realizado com sucesso!', 'success');
        } else {
            showAlert(alertDiv, data.message, 'error');
        }
    } catch (error) {
        console.error('Erro no login:', error);
        showAlert(alertDiv, 'Erro ao fazer login. Tente novamente.', 'error');
    }
}

// Função de logout
async function logout() {
    try {
        await fetch(`${API_BASE}/admin/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        
        currentUser = null;
        showLoginForm();
        
        // Limpar campos
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
    } catch (error) {
        console.error('Erro no logout:', error);
    }
}

// Mostrar aba
function showTab(tabName) {
    // Remover classe active de todas as abas
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Ativar aba selecionada
    event.target.classList.add('active');
    document.getElementById(tabName).classList.add('active');
    
    // Carregar dados específicos da aba
    switch(tabName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'products':
            loadProducts();
            break;
        case 'orders':
            loadOrders();
            break;
    }
}

// Carregar dashboard
async function loadDashboard() {
    const container = document.getElementById('statsContainer');
    container.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i><p>Carregando estatísticas...</p></div>';
    
    try {
        const response = await fetch(`${API_BASE}/admin/stats`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success) {
            stats = data.stats;
            renderStats();
        } else {
            container.innerHTML = '<div class="alert alert-error">Erro ao carregar estatísticas.</div>';
        }
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        container.innerHTML = '<div class="alert alert-error">Erro ao carregar estatísticas.</div>';
    }
}

// Renderizar estatísticas
function renderStats() {
    const container = document.getElementById('statsContainer');
    
    const html = `
        <div class="stats-grid">
            <div class="stat-card">
                <span class="stat-number">R$ ${stats.total_sales.toFixed(2)}</span>
                <span class="stat-label">Total de Vendas</span>
            </div>
            <div class="stat-card">
                <span class="stat-number">${stats.total_orders}</span>
                <span class="stat-label">Pedidos Pagos</span>
            </div>
            <div class="stat-card">
                <span class="stat-number">${stats.pending_orders}</span>
                <span class="stat-label">Pedidos Pendentes</span>
            </div>
            <div class="stat-card">
                <span class="stat-number">${products.length}</span>
                <span class="stat-label">Produtos Ativos</span>
            </div>
        </div>
        
        <h3 style="margin: 2rem 0 1rem 0; color: #00d4ff;">
            <i class="fas fa-trophy"></i> Produtos Mais Vendidos
        </h3>
        <div class="products-grid">
            ${stats.popular_products.map(product => `
                <div class="product-card">
                    <h4>${product.name}</h4>
                    <p class="price">${product.total_sold} vendas</p>
                </div>
            `).join('')}
        </div>
    `;
    
    container.innerHTML = html;
}

// Carregar produtos
async function loadProducts() {
    const container = document.getElementById('productsContainer');
    container.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i><p>Carregando produtos...</p></div>';
    
    try {
        const response = await fetch(`${API_BASE}/admin/products`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success) {
            products = data.products;
            renderProducts();
        } else {
            container.innerHTML = '<div class="alert alert-error">Erro ao carregar produtos.</div>';
        }
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        container.innerHTML = '<div class="alert alert-error">Erro ao carregar produtos.</div>';
    }
}

// Renderizar produtos
function renderProducts() {
    const container = document.getElementById('productsContainer');
    
    const html = `
        <div class="products-grid">
            ${products.map(product => `
                <div class="product-card">
                    <h3>${product.name}</h3>
                    <span class="category">${product.category}</span>
                    <p>${product.description}</p>
                    <p class="price">R$ ${product.price.toFixed(2)}</p>
                    <p style="color: ${product.is_active ? '#4ade80' : '#ef4444'};">
                        <i class="fas fa-circle"></i> ${product.is_active ? 'Ativo' : 'Inativo'}
                    </p>
                    <div class="product-actions">
                        <button class="btn" onclick="editProduct(${product.id})">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn btn-danger" onclick="deleteProduct(${product.id})">
                            <i class="fas fa-trash"></i> Remover
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    container.innerHTML = html;
}

// Carregar pedidos
async function loadOrders() {
    const container = document.getElementById('ordersContainer');
    container.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i><p>Carregando pedidos...</p></div>';
    
    try {
        const response = await fetch(`${API_BASE}/admin/orders`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success) {
            orders = data.orders;
            renderOrders();
        } else {
            container.innerHTML = '<div class="alert alert-error">Erro ao carregar pedidos.</div>';
        }
    } catch (error) {
        console.error('Erro ao carregar pedidos:', error);
        container.innerHTML = '<div class="alert alert-error">Erro ao carregar pedidos.</div>';
    }
}

// Renderizar pedidos
function renderOrders() {
    const container = document.getElementById('ordersContainer');
    
    const html = `
        <table class="orders-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Cliente</th>
                    <th>Email</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Data</th>
                </tr>
            </thead>
            <tbody>
                ${orders.map(order => `
                    <tr>
                        <td>#${order.id}</td>
                        <td>${order.customer_name}</td>
                        <td>${order.customer_email}</td>
                        <td>R$ ${order.total_amount.toFixed(2)}</td>
                        <td>
                            <span class="status-badge status-${order.status}">
                                ${getStatusText(order.status)}
                            </span>
                        </td>
                        <td>${new Date(order.created_at).toLocaleDateString('pt-BR')}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

// Obter texto do status
function getStatusText(status) {
    const statusMap = {
        'pending': 'Pendente',
        'paid': 'Pago',
        'cancelled': 'Cancelado'
    };
    return statusMap[status] || status;
}

// Adicionar produto
document.getElementById('productForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('productName').value,
        description: document.getElementById('productDescription').value,
        price: parseFloat(document.getElementById('productPrice').value),
        category: document.getElementById('productCategory').value,
        image_url: document.getElementById('productImageUrl').value,
        file_url: document.getElementById('productFileUrl').value,
        download_limit: parseInt(document.getElementById('productDownloadLimit').value)
    };
    
    const alertDiv = document.getElementById('productAlert');
    
    try {
        const response = await fetch(`${API_BASE}/admin/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert(alertDiv, 'Produto criado com sucesso!', 'success');
            document.getElementById('productForm').reset();
            
            // Recarregar produtos se estiver na aba de produtos
            if (document.getElementById('products').classList.contains('active')) {
                loadProducts();
            }
        } else {
            showAlert(alertDiv, data.message, 'error');
        }
    } catch (error) {
        console.error('Erro ao criar produto:', error);
        showAlert(alertDiv, 'Erro ao criar produto. Tente novamente.', 'error');
    }
});

// Editar produto
function editProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    // Preencher formulário com dados do produto
    document.getElementById('productName').value = product.name;
    document.getElementById('productDescription').value = product.description;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productCategory').value = product.category;
    document.getElementById('productImageUrl').value = product.image_url;
    document.getElementById('productFileUrl').value = product.file_url;
    document.getElementById('productDownloadLimit').value = product.download_limit;
    
    // Mudar para aba de adicionar produto
    showTab('add-product');
    
    // Alterar comportamento do formulário para edição
    const form = document.getElementById('productForm');
    form.onsubmit = async function(e) {
        e.preventDefault();
        await updateProduct(productId);
    };
}

// Atualizar produto
async function updateProduct(productId) {
    const formData = {
        name: document.getElementById('productName').value,
        description: document.getElementById('productDescription').value,
        price: parseFloat(document.getElementById('productPrice').value),
        category: document.getElementById('productCategory').value,
        image_url: document.getElementById('productImageUrl').value,
        file_url: document.getElementById('productFileUrl').value,
        download_limit: parseInt(document.getElementById('productDownloadLimit').value)
    };
    
    const alertDiv = document.getElementById('productAlert');
    
    try {
        const response = await fetch(`${API_BASE}/admin/products/${productId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert(alertDiv, 'Produto atualizado com sucesso!', 'success');
            document.getElementById('productForm').reset();
            
            // Restaurar comportamento normal do formulário
            document.getElementById('productForm').onsubmit = null;
            
            // Recarregar produtos
            loadProducts();
        } else {
            showAlert(alertDiv, data.message, 'error');
        }
    } catch (error) {
        console.error('Erro ao atualizar produto:', error);
        showAlert(alertDiv, 'Erro ao atualizar produto. Tente novamente.', 'error');
    }
}

// Deletar produto
async function deleteProduct(productId) {
    if (!confirm('Tem certeza que deseja remover este produto?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/admin/products/${productId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Produto removido com sucesso!');
            loadProducts();
        } else {
            alert('Erro ao remover produto: ' + data.message);
        }
    } catch (error) {
        console.error('Erro ao deletar produto:', error);
        alert('Erro ao remover produto. Tente novamente.');
    }
}

// Função auxiliar para mostrar alertas
function showAlert(container, message, type) {
    const alertClass = type === 'success' ? 'alert-success' : 'alert-error';
    container.innerHTML = `<div class="alert ${alertClass}">${message}</div>`;
    
    // Remover alerta após 5 segundos
    setTimeout(() => {
        container.innerHTML = '';
    }, 5000);
}

// Permitir login com Enter
document.getElementById('password').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        login();
    }
});

