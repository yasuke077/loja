import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory
from flask_cors import CORS
from src.models.user import db
from src.models.product import Product, Order, OrderItem, Download
from src.routes.user import user_bp
from src.routes.products import products_bp
from src.routes.orders import orders_bp
from src.routes.admin import admin_bp

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))
app.config['SECRET_KEY'] = 'stellaxsec_super_secret_key_2025!'

# Configurar CORS para permitir requisições do Neocities
CORS(app, origins=['https://stellaxsec.neocities.org', 'http://localhost:3000'], supports_credentials=True)

# Registrar blueprints
app.register_blueprint(user_bp, url_prefix='/api')
app.register_blueprint(products_bp, url_prefix='/api')
app.register_blueprint(orders_bp, url_prefix='/api')
app.register_blueprint(admin_bp, url_prefix='/api')

# Configuração do banco de dados
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(os.path.dirname(__file__), 'database', 'app.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

# Criar tabelas
with app.app_context():
    db.create_all()
    
    # Criar produtos de exemplo se não existirem
    if Product.query.count() == 0:
        sample_products = [
            Product(
                name="Curso Completo de Ethical Hacking",
                description="Aprenda técnicas avançadas de ethical hacking e pentesting. Curso completo com mais de 50 horas de conteúdo.",
                price=297.00,
                category="Cursos",
                image_url="/static/images/curso-ethical-hacking.jpg",
                file_url="/static/files/curso-ethical-hacking.zip",
                is_digital=True,
                download_limit=3
            ),
            Product(
                name="E-book: Segurança em Redes",
                description="Guia completo sobre segurança em redes corporativas. 200 páginas de conteúdo técnico.",
                price=47.00,
                category="E-books",
                image_url="/static/images/ebook-redes.jpg",
                file_url="/static/files/ebook-seguranca-redes.pdf",
                is_digital=True,
                download_limit=5
            ),
            Product(
                name="Kit de Ferramentas de Pentesting",
                description="Coleção de scripts e ferramentas para pentesting. Inclui documentação completa.",
                price=127.00,
                category="Ferramentas",
                image_url="/static/images/kit-pentesting.jpg",
                file_url="/static/files/kit-pentesting.zip",
                is_digital=True,
                download_limit=3
            ),
            Product(
                name="Consultoria em Cibersegurança - 1h",
                description="Sessão de consultoria personalizada com especialista em cibersegurança.",
                price=197.00,
                category="Consultoria",
                image_url="/static/images/consultoria.jpg",
                file_url="",
                is_digital=False,
                download_limit=0
            )
        ]
        
        for product in sample_products:
            db.session.add(product)
        
        db.session.commit()
        print("Produtos de exemplo criados!")

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    static_folder_path = app.static_folder
    if static_folder_path is None:
            return "Static folder not configured", 404

    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            return "API StellaxSec - Backend funcionando!", 200

# Rota de teste
@app.route('/api/test', methods=['GET'])
def test_api():
    return {
        'success': True,
        'message': 'API StellaxSec funcionando!',
        'version': '1.0.0'
    }

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
