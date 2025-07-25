from flask import Blueprint, request, jsonify
from src.models.user import db
from src.models.product import Product, Order, OrderItem, Download
from datetime import datetime
import os

products_bp = Blueprint('products', __name__)

# Listar todos os produtos ativos
@products_bp.route('/products', methods=['GET'])
def get_products():
    try:
        category = request.args.get('category')
        if category:
            products = Product.query.filter_by(is_active=True, category=category).all()
        else:
            products = Product.query.filter_by(is_active=True).all()
        
        return jsonify({
            'success': True,
            'products': [product.to_dict() for product in products]
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Erro ao buscar produtos: {str(e)}'
        }), 500

# Buscar produto por ID
@products_bp.route('/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    try:
        product = Product.query.get_or_404(product_id)
        if not product.is_active:
            return jsonify({
                'success': False,
                'message': 'Produto não encontrado'
            }), 404
        
        return jsonify({
            'success': True,
            'product': product.to_dict()
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Erro ao buscar produto: {str(e)}'
        }), 500

# Criar novo produto (Admin)
@products_bp.route('/admin/products', methods=['POST'])
def create_product():
    try:
        data = request.get_json()
        
        # Validação básica
        required_fields = ['name', 'price', 'category']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'message': f'Campo obrigatório: {field}'
                }), 400
        
        product = Product(
            name=data['name'],
            description=data.get('description', ''),
            price=float(data['price']),
            category=data['category'],
            image_url=data.get('image_url', ''),
            file_url=data.get('file_url', ''),
            is_digital=data.get('is_digital', True),
            download_limit=data.get('download_limit', 3)
        )
        
        db.session.add(product)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Produto criado com sucesso',
            'product': product.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Erro ao criar produto: {str(e)}'
        }), 500

# Atualizar produto (Admin)
@products_bp.route('/admin/products/<int:product_id>', methods=['PUT'])
def update_product(product_id):
    try:
        product = Product.query.get_or_404(product_id)
        data = request.get_json()
        
        # Atualizar campos
        if 'name' in data:
            product.name = data['name']
        if 'description' in data:
            product.description = data['description']
        if 'price' in data:
            product.price = float(data['price'])
        if 'category' in data:
            product.category = data['category']
        if 'image_url' in data:
            product.image_url = data['image_url']
        if 'file_url' in data:
            product.file_url = data['file_url']
        if 'is_active' in data:
            product.is_active = data['is_active']
        if 'is_digital' in data:
            product.is_digital = data['is_digital']
        if 'download_limit' in data:
            product.download_limit = data['download_limit']
        
        product.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Produto atualizado com sucesso',
            'product': product.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Erro ao atualizar produto: {str(e)}'
        }), 500

# Deletar produto (Admin)
@products_bp.route('/admin/products/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    try:
        product = Product.query.get_or_404(product_id)
        
        # Soft delete - apenas desativar
        product.is_active = False
        product.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Produto removido com sucesso'
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Erro ao remover produto: {str(e)}'
        }), 500

# Listar todos os produtos (Admin)
@products_bp.route('/admin/products', methods=['GET'])
def get_all_products():
    try:
        products = Product.query.all()
        return jsonify({
            'success': True,
            'products': [product.to_dict() for product in products]
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Erro ao buscar produtos: {str(e)}'
        }), 500

# Buscar categorias disponíveis
@products_bp.route('/categories', methods=['GET'])
def get_categories():
    try:
        categories = db.session.query(Product.category).filter_by(is_active=True).distinct().all()
        category_list = [cat[0] for cat in categories if cat[0]]
        
        return jsonify({
            'success': True,
            'categories': category_list
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Erro ao buscar categorias: {str(e)}'
        }), 500

