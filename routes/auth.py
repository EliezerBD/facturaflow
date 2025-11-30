from flask import Blueprint, jsonify, request, make_response, redirect
from services.container import gmail_service # Importamos del container

# Creamos el Blueprint
auth_bp = Blueprint('auth', __name__)
FRONTEND_URL = 'http://localhost:5000'

@auth_bp.route('/auth/google', methods=['GET'])
def google_auth():
    try:
        auth_url, state = gmail_service.get_auth_url()
        return jsonify({'authUrl': auth_url, 'state': state})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/auth/callback', methods=['GET'])
def google_callback():
    try:
        code = request.args.get('code')
        token = gmail_service.get_token(code)
        
        resp = make_response(redirect(f"{FRONTEND_URL}/#auth_success"))
        resp.set_cookie('gmail_token', token, httponly=True, secure=True, samesite='Lax')
        return resp
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/auth/logout', methods=['POST'])
def logout():
    resp = make_response(jsonify({'success': True}))
    resp.set_cookie('gmail_token', '', expires=0)
    return resp