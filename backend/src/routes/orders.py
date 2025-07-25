from flask import Blueprint, request, jsonify
from src.models.user import db
from src.models.product import Product, Order, OrderItem, Download
from datetime import datetime
import requests
import json
import base64
from cryptography.fernet import Fernet
import os

orders_bp = Blueprint('orders', __name__)

# Chave da API LivePix (criptografada)
LIVEPIX_API_KEY = "w8ACNnoVmrZy2T4dxxVxh7aekmLazw7H5getYBVLOoaLmSypI3xiM1DEnM5tZ+hmtx/Lw0hH5Mb4MMRZYOl1Atucm8uCfJIbJGK1rPPVeZKV+7msfxc5/EGIb6LZ+/NrsXN+rhejUd7CDZnU2zsUcjmgKO2lYwkZ/WT27Wh76e4"

# Função para criar pagamento no LivePix
def create_livepix_payment(amount, description, customer_email):
    try:
        # URL da API LivePix (baseada na documentação)
        url = "https://api.livepix.gg/v1/payments"
        
        headers = {
            'Authorization': f'Bearer {LIVEPIX_API_KEY}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            'amount': amount,
            'description': description,
            'customer_email': customer_email,
            'webhook_url': f'{request.host_url}api/webhook/livepix'
        }
        
        response = requests.post(url, headers=headers, json=payload)
        
        if response.status_code == 201:
            return response.json()
        else:
            return None
    except Exception as e:
        print(f"Erro ao criar pagamento LivePix: {str(e)}")
        return None

# Criar novo pedido
@orders_bp.route('/orders', methods=['POST'])
def create_order():
    try:
        data = request.get_json()
        
        # Validação básica
        required_fields = ['customer_email', 'customer_name', 'items']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'message': f'Campo obrigatório: {field}'
                }), 400
        
        # Validar itens e calcular total
        total_amount = 0
        order_items = []
        
        for item in data['items']:
            product = Product.query.get(item['product_id'])
            if not product or not product.is_active:
                return jsonify({
                    'success': False,
                    'message': f'Produto não encontrado: {item["product_id"]}'
                }), 400
            
            quantity = item.get('quantity', 1)
            item_total = product.price * quantity
            total_amount += item_total
            
            order_items.append({
                'product': product,
                'quantity': quantity,
                'price': product.price
            })
        
        # Criar pedido
        order = Order(
            customer_email=data['customer_email'],
            customer_name=data['customer_name'],
            total_amount=total_amount,
            status='pending'
        )
        
        db.session.add(order)
        db.session.flush()  # Para obter o ID do pedido
        
        # Adicionar itens do pedido
        for item_data in order_items:
            order_item = OrderItem(
                order_id=order.id,
                product_id=item_data['product'].id,
                quantity=item_data['quantity'],
                price=item_data['price']
            )
            db.session.add(order_item)
        
        # Criar pagamento no LivePix
        payment_description = f"Pedido #{order.id} - StellaxSec"
        livepix_payment = create_livepix_payment(
            total_amount,
            payment_description,
            data['customer_email']
        )
        
        if livepix_payment:
            order.livepix_payment_id = livepix_payment.get('id')
        
        db.session.commit()
        
        response_data = {
            'success': True,
            'message': 'Pedido criado com sucesso',
            'order': order.to_dict()
        }
        
        # Adicionar dados do pagamento se disponível
        if livepix_payment:
            response_data['payment'] = {
                'qr_code': livepix_payment.get('qr_code'),
                'pix_key': livepix_payment.get('pix_key'),
                'amount': livepix_payment.get('amount'),
                'expires_at': livepix_payment.get('expires_at')
            }
        
        return jsonify(response_data), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Erro ao criar pedido: {str(e)}'
        }), 500

# Buscar pedido por ID
@orders_bp.route('/orders/<int:order_id>', methods=['GET'])
def get_order(order_id):
    try:
        order = Order.query.get_or_404(order_id)
        return jsonify({
            'success': True,
            'order': order.to_dict()
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Erro ao buscar pedido: {str(e)}'
        }), 500

# Webhook do LivePix
@orders_bp.route('/webhook/livepix', methods=['POST'])
def livepix_webhook():
    try:
        data = request.get_json()
        
        # Verificar se é um pagamento aprovado
        if data.get('status') == 'paid':
            payment_id = data.get('id')
            
            # Buscar pedido pelo ID do pagamento
            order = Order.query.filter_by(livepix_payment_id=payment_id).first()
            
            if order:
                # Atualizar status do pedido
                order.status = 'paid'
                order.updated_at = datetime.utcnow()
                
                # Criar registros de download para produtos digitais
                for item in order.items:
                    if item.product.is_digital:
                        download = Download(
                            order_id=order.id,
                            product_id=item.product_id,
                            download_count=0
                        )
                        db.session.add(download)
                
                db.session.commit()
                
                return jsonify({'success': True}), 200
        
        return jsonify({'success': True}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Erro no webhook: {str(e)}'
        }), 500

# Download de arquivo digital
@orders_bp.route('/download/<int:order_id>/<int:product_id>', methods=['GET'])
def download_file(order_id, product_id):
    try:
        # Verificar se o pedido existe e está pago
        order = Order.query.get_or_404(order_id)
        if order.status != 'paid':
            return jsonify({
                'success': False,
                'message': 'Pedido não foi pago ainda'
            }), 403
        
        # Verificar se o produto está no pedido
        order_item = OrderItem.query.filter_by(
            order_id=order_id,
            product_id=product_id
        ).first()
        
        if not order_item:
            return jsonify({
                'success': False,
                'message': 'Produto não encontrado no pedido'
            }), 404
        
        product = order_item.product
        if not product.is_digital or not product.file_url:
            return jsonify({
                'success': False,
                'message': 'Produto não é digital ou arquivo não disponível'
            }), 400
        
        # Verificar limite de downloads
        download_record = Download.query.filter_by(
            order_id=order_id,
            product_id=product_id
        ).first()
        
        if download_record:
            if download_record.download_count >= product.download_limit:
                return jsonify({
                    'success': False,
                    'message': f'Limite de downloads excedido ({product.download_limit})'
                }), 403
            
            # Incrementar contador
            download_record.download_count += 1
            download_record.last_download = datetime.utcnow()
        else:
            # Criar registro de download
            download_record = Download(
                order_id=order_id,
                product_id=product_id,
                download_count=1,
                last_download=datetime.utcnow()
            )
            db.session.add(download_record)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'download_url': product.file_url,
            'downloads_remaining': product.download_limit - download_record.download_count
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Erro no download: {str(e)}'
        }), 500

# Listar pedidos (Admin)
@orders_bp.route('/admin/orders', methods=['GET'])
def get_all_orders():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status')
        
        query = Order.query
        if status:
            query = query.filter_by(status=status)
        
        orders = query.order_by(Order.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'orders': [order.to_dict() for order in orders.items],
            'pagination': {
                'page': page,
                'pages': orders.pages,
                'per_page': per_page,
                'total': orders.total
            }
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Erro ao buscar pedidos: {str(e)}'
        }), 500

# Estatísticas de vendas (Admin)
@orders_bp.route('/admin/stats', methods=['GET'])
def get_sales_stats():
    try:
        # Total de vendas
        total_sales = db.session.query(db.func.sum(Order.total_amount)).filter_by(status='paid').scalar() or 0
        
        # Número de pedidos
        total_orders = Order.query.filter_by(status='paid').count()
        
        # Pedidos pendentes
        pending_orders = Order.query.filter_by(status='pending').count()
        
        # Produtos mais vendidos
        popular_products = db.session.query(
            Product.name,
            db.func.sum(OrderItem.quantity).label('total_sold')
        ).join(OrderItem).join(Order).filter(Order.status == 'paid').group_by(Product.id).order_by(db.desc('total_sold')).limit(5).all()
        
        return jsonify({
            'success': True,
            'stats': {
                'total_sales': total_sales,
                'total_orders': total_orders,
                'pending_orders': pending_orders,
                'popular_products': [
                    {'name': name, 'total_sold': total_sold}
                    for name, total_sold in popular_products
                ]
            }
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Erro ao buscar estatísticas: {str(e)}'
        }), 500

