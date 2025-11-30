from flask import Blueprint, send_from_directory, jsonify, redirect
import os

web_bp = Blueprint('web', __name__)

# Ruta principal - Dashboard
@web_bp.route('/')
def serve_frontend():
    return send_from_directory('frontend/dashboard', 'index.html')

# Ruta CV - Redirección para manejar correctamente rutas relativas
@web_bp.route('/cv')
def serve_cv_redirect():
    return redirect('/cv/')

# Ruta CV - Archivo principal
@web_bp.route('/cv/')
def serve_cv():
    return send_from_directory('frontend/cv', 'index.html')

# Archivos estáticos del CV (css, imágenes, etc.)
@web_bp.route('/cv/<path:filename>')
def serve_cv_static(filename):
    return send_from_directory('frontend/cv', filename)

# Ruta Estadistica - Redirección
@web_bp.route('/estadistica')
def serve_estadistica_redirect():
    return redirect('/estadistica/')

# Ruta Estadistica - Archivo principal
@web_bp.route('/estadistica/')
def serve_estadistica():
    return send_from_directory('frontend/Estadisticas/estadistica', 'estadistica.html')

# Archivos estáticos de Estadistica
@web_bp.route('/estadistica/<path:filename>')
def serve_estadistica_static(filename):
    return send_from_directory('frontend/Estadisticas/estadistica', filename)

# Archivos estáticos del Dashboard y fallback
@web_bp.route('/<path:path>')
def serve_static(path):
    # Intentar servir desde frontend/dashboard
    try:
        return send_from_directory('frontend/dashboard', path)
    except:
        # Si no existe, y es un archivo sensible del root, bloquear explícitamente
        if path in ['app.py', 'config.env', 'Dockerfile', 'docker-compose.yml', 'requirements.txt']:
             return jsonify({'error': 'Prohibido'}), 403
        
        # Si no se encuentra en dashboard, devolver 404
        return jsonify({'error': 'Archivo no encontrado'}), 404