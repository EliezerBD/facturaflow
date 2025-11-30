from flask import Blueprint, jsonify, request, send_file
import io
import os
import zipfile
from services.container import gmail_service, db_service, invoice_processor

api_bp = Blueprint('api', __name__)

@api_bp.route('/api/search', methods=['POST'])
def search_emails():
    try:
        data = request.json
        token = request.cookies.get('gmail_token')
        if not token:
            return jsonify({'error': 'No autorizado'}), 401
        
        gmail_service.build_service(token)
        
        query = "has:attachment " + data.get('search', '')
        
        # 1. Buscar IDs
        messages = gmail_service.search_emails(query, max_results=20)
        
        if not messages:
             return jsonify({'success': True, 'emails': [], 'total': 0})

        # 2. Obtener detalles en lote
        message_ids = [msg['id'] for msg in messages]
        messages_details = gmail_service.get_messages_batch(message_ids)
        
        # 3. Formatear para el frontend
        formatted_emails = []
        for msg_id, msg_data in messages_details.items():
            if not msg_data: continue
            
            payload = msg_data.get('payload', {})
            headers = payload.get('headers', [])
            
            def get_header(name):
                return next((h['value'] for h in headers if h['name'] == name), 'Desconocido')
                
            # Buscar adjuntos
            attachments = gmail_service.find_attachments_recursive(msg_id, payload.get('parts', []))
            
            formatted_emails.append({
                'id': msg_id,
                'subject': get_header('Subject'),
                'from': get_header('From'),
                'date': get_header('Date'),
                'snippet': msg_data.get('snippet', ''),
                'attachments': attachments
            })
            
        return jsonify({'success': True, 'emails': formatted_emails, 'total': len(formatted_emails)})

    except Exception as e:
        print(f"Error en search: {e}")
        return jsonify({'error': str(e)}), 500

@api_bp.route('/api/process-invoices', methods=['POST'])
def process_invoices():
    try:
        token = request.cookies.get('gmail_token')
        if not token:
            return jsonify({'error': 'No autorizado'}), 401
        
        gmail_service.build_service(token)
        
        # Importante: Usamos el connection context manager si es posible, o try/finally
        if not db_service.connect():
            return jsonify({'error': 'Error de base de datos'}), 500
        
        try:
            results = invoice_processor.process_invoices()
            return jsonify({
                'success': True, 
                'nuevas': results['nuevas'],
                'duplicadas': results['duplicadas'],
                'errores': results['errores'],
                'detalles': results['detalles']
            })
        finally:
            db_service.disconnect()
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/api/dashboard-stats', methods=['GET'])
def dashboard_stats():
    """Obtiene estadísticas para el dashboard"""
    try:
        token = request.cookies.get('gmail_token')
        if not token:
            return jsonify({'error': 'No autorizado'}), 401
        
        # Conectar a la base de datos
        if not db_service.connect():
            return jsonify({'error': 'Error de base de datos'}), 500
        
        try:
            stats = db_service.get_dashboard_stats()
            if not stats:
                return jsonify({'error': 'Error obteniendo estadísticas'}), 500
            
            # Mapear tipos de DTE a nombres legibles
            tipo_dte_map = {
                '01': 'Factura',
                '03': 'Comprobante de Crédito Fiscal',
                '04': 'Nota de Remisión',
                '05': 'Nota de Crédito',
                '06': 'Nota de Débito',
                '07': 'Comprobante de Retención',
                '08': 'Comprobante de Liquidación',
                '09': 'Documento Contable de Liquidación',
                '11': 'Factura de Exportación',
                '14': 'Factura de Sujeto Excluido',
                '15': 'Comprobante de Donación'
            }
            
            # Formatear distribución por tipo
            formatted_by_type = []
            for item in stats['by_type']:
                tipo_code = item['tipo_dte']
                formatted_by_type.append({
                    'tipo': tipo_dte_map.get(tipo_code, f'Tipo {tipo_code}'),
                    'count': item['count']
                })
            
            # Formatear actividad reciente
            formatted_activity = []
            for item in stats['recent_activity']:
                tipo_code = item['tipo_dte']
                formatted_activity.append({
                    'codigo_generacion': item['codigo_generacion'],
                    'fecha_emision': item['fecha_emision'],
                    'nombre_emisor': item['nombre_emisor'],
                    'total_pagar': float(item['total_pagar']),
                    'tipo': tipo_dte_map.get(tipo_code, f'Tipo {tipo_code}')
                })
            
            return jsonify({
                'success': True,
                'total_docs': stats['total_docs'],
                'total_amount': stats['total_amount'],
                'current_month_amount': stats['current_month_amount'],
                'recurring_count': stats['recurring_count'],
                'by_type': formatted_by_type,
                'trends': stats['trends'],
                'recent_activity': formatted_activity
            })
            
        finally:
            db_service.disconnect()
            
    except Exception as e:
        print(f"Error en dashboard-stats: {e}")
        return jsonify({'error': str(e)}), 500