from flask import Blueprint, request, jsonify, session
from werkzeug.security import check_password_hash, generate_password_hash
from functools import wraps
import os

admin_bp = Blueprint('admin', __name__)

# Credenciais de admin (em produção, usar banco de dados)
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD_HASH = generate_password_hash("stellaxsecadm@80828011@2025!")  # Senha padrão

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'admin_logged_in' not in session:
            return jsonify({
                'success': False,
                'message': 'Acesso negado. Login de administrador necessário.'
            }), 401
        return f(*args, **kwargs)
    return decorated_function

# Login do administrador
@admin_bp.route('/admin/login', methods=['POST'])
def admin_login():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({
                'success': False,
                'message': 'Username e senha são obrigatórios'
            }), 400
        
        # Verificar credenciais
        if username == ADMIN_USERNAME and check_password_hash(ADMIN_PASSWORD_HASH, password):
            session['admin_logged_in'] = True
            session['admin_username'] = username
            
            return jsonify({
                'success': True,
                'message': 'Login realizado com sucesso',
                'admin': {
                    'username': username,
                    'logged_in': True
                }
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': 'Credenciais inválidas'
            }), 401
            
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Erro no login: {str(e)}'
        }), 500

# Logout do administrador
@admin_bp.route('/admin/logout', methods=['POST'])
def admin_logout():
    try:
        session.pop('admin_logged_in', None)
        session.pop('admin_username', None)
        
        return jsonify({
            'success': True,
            'message': 'Logout realizado com sucesso'
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Erro no logout: {str(e)}'
        }), 500

# Verificar status do login
@admin_bp.route('/admin/status', methods=['GET'])
def admin_status():
    try:
        if 'admin_logged_in' in session:
            return jsonify({
                'success': True,
                'admin': {
                    'username': session.get('admin_username'),
                    'logged_in': True
                }
            }), 200
        else:
            return jsonify({
                'success': True,
                'admin': {
                    'logged_in': False
                }
            }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Erro ao verificar status: {str(e)}'
        }), 500

# Upload de arquivo
@admin_bp.route('/admin/upload', methods=['POST'])
@admin_required
def upload_file():
    try:
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'message': 'Nenhum arquivo enviado'
            }), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({
                'success': False,
                'message': 'Nenhum arquivo selecionado'
            }), 400
        
        # Criar diretório de uploads se não existir
        upload_dir = os.path.join(os.path.dirname(__file__), '..', 'static', 'uploads')
        os.makedirs(upload_dir, exist_ok=True)
        
        # Salvar arquivo
        filename = file.filename
        file_path = os.path.join(upload_dir, filename)
        file.save(file_path)
        
        # URL do arquivo
        file_url = f'/static/uploads/{filename}'
        
        return jsonify({
            'success': True,
            'message': 'Arquivo enviado com sucesso',
            'file_url': file_url
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Erro no upload: {str(e)}'
        }), 500

