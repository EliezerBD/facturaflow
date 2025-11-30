from flask import Flask
from flask_cors import CORS
import os

# Importar las rutas (Blueprints)
from routes.auth import auth_bp
from routes.api import api_bp
from routes.web import web_bp

from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

app = Flask(__name__)

# Configuración de Rate Limiting (Seguridad anti-DDoS básica)
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)

# Configuración CORS (Global)
# Restringir orígenes al frontend configurado y al nuevo puerto del dashboard
allowed_origins = [
    os.environ.get('FRONTEND_URL', 'http://localhost:5000'),
    'http://localhost:8081'
]

CORS(app, resources={
    "/api/*": {"origins": allowed_origins, "supports_credentials": True},
    "/auth/*": {"origins": allowed_origins, "supports_credentials": True}
})

# Registrar los Blueprints
app.register_blueprint(web_bp)  # Rutas raíz (Frontend)
app.register_blueprint(auth_bp) # Rutas /auth/...
app.register_blueprint(api_bp)  # Rutas /api/...

# Middleware para cabeceras de seguridad
@app.after_request
def add_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    return response

from services.container import db_service

if __name__ == '__main__':
    # Inicializar tablas de BD
    print("Verificando base de datos...")
    db_service.create_tables()
    
    # IMPORTANTE: debug=False en producción
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)), debug=False)