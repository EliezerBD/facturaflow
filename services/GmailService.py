import base64
import json
import time
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow

class GmailService:
    def __init__(self, client_id, client_secret, redirect_uri):
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri
        self.service = None
    
    def build_service(self, token):
        """Construye el servicio de Gmail con el token"""
        self.service = build('gmail', 'v1', credentials=Credentials(token=token))
        return self.service
    
    def get_auth_url(self):
        """Genera URL de autenticación"""
        flow = Flow.from_client_config(
            {"web": {
                "client_id": self.client_id, 
                "client_secret": self.client_secret, 
                "auth_uri": "https://accounts.google.com/o/oauth2/auth", 
                "token_uri": "https://oauth2.googleapis.com/token"
            }},
            scopes=['https://www.googleapis.com/auth/gmail.readonly']
        )
        flow.redirect_uri = self.redirect_uri
        auth_url, state = flow.authorization_url(prompt='consent')
        return auth_url, state
    
    def get_token(self, code):
        """Obtiene token con el código de autorización"""
        flow = Flow.from_client_config(
            {"web": {
                "client_id": self.client_id, 
                "client_secret": self.client_secret, 
                "auth_uri": "https://accounts.google.com/o/oauth2/auth", 
                "token_uri":"https://oauth2.googleapis.com/token"
            }},
            scopes=['https://www.googleapis.com/auth/gmail.readonly']
        )
        flow.redirect_uri = self.redirect_uri
        flow.fetch_token(code=code)
        return flow.credentials.token
    
    def search_emails(self, query, max_results=20):
        """Busca emails con query específica"""
        results = self.service.users().messages().list(
            userId='me', q=query, maxResults=max_results
        ).execute()
        return results.get('messages', [])
    
    def get_message_details(self, message_id):
        """Obtiene detalles completos de un mensaje"""
        return self.service.users().messages().get(
            userId='me', id=message_id, format='full'
        ).execute()
    
    def get_attachment(self, message_id, attachment_id):
        """Descarga un archivo adjunto"""
        data = self.service.users().messages().attachments().get(
            userId='me', messageId=message_id, id=attachment_id
        ).execute()
        return base64.urlsafe_b64decode(data['data'].encode('UTF-8'))
    
    def find_attachments_recursive(self, message_id, parts):
        """Busca adjuntos recursivamente"""
        attachments = []
        if not parts: return []
        
        for part in parts:
            if part.get('filename') and part.get('body', {}).get('attachmentId'):
                filename = part.get('filename')
                if filename.lower().endswith(('.pdf', '.xml', '.json')):
                    attachments.append({
                        'filename': filename,
                        'mimeType': part.get('mimeType'),
                        'attachmentId': part['body']['attachmentId']
                    })
            if 'parts' in part:
                attachments.extend(self.find_attachments_recursive(message_id, part['parts']))
        return attachments

    def get_messages_batch(self, message_ids, batch_size=10):
        """Obtiene detalles de múltiples mensajes en lotes pequeños para evitar Rate Limit"""
        messages_data = {}
        
        # Dividir en chunks (grupos pequeños)
        chunks = [message_ids[i:i + batch_size] for i in range(0, len(message_ids), batch_size)]
        
        for i, chunk in enumerate(chunks):
            def callback(request_id, response, exception):
                if exception:
                    print(f"Error en batch para {request_id}: {exception}")
                else:
                    messages_data[request_id] = response

            batch = self.service.new_batch_http_request(callback=callback)
            
            for msg_id in chunk:
                batch.add(self.service.users().messages().get(
                    userId='me', id=msg_id, format='full'
                ), request_id=msg_id)
            
            try:
                batch.execute()
                # Pequeña pausa entre lotes para no saturar la API
                if i < len(chunks) - 1:
                    time.sleep(1)
            except Exception as e:
                print(f"Error ejecutando lote: {e}")
                
        return messages_data

    def get_json_from_message(self, message_input):
        """Versión optimizada y recursiva para extraer JSON. Acepta ID o objeto mensaje completo"""
        try:
            # Si es string, es un ID y hay que buscarlo (compatibilidad hacia atrás)
            if isinstance(message_input, str):
                message = self.get_message_details(message_input)
                message_id = message_input
            else:
                # Si es dict, ya es el mensaje completo
                message = message_input
                message_id = message.get('id')

            parts = message.get('payload', {}).get('parts', [])
            
            # Función interna recursiva para buscar JSON
            def find_json_in_parts(parts_list):
                for part in parts_list:
                    # Caso 1: Es un archivo JSON
                    filename = part.get('filename', '').lower()
                    if filename.endswith('.json') and part.get('body', {}).get('attachmentId'):
                        return part['body']['attachmentId']
                    
                    # Caso 2: Es un contenedor (multipart) -> Recursividad
                    if 'parts' in part:
                        found_id = find_json_in_parts(part['parts'])
                        if found_id:
                            return found_id
                return None

            attachment_id = find_json_in_parts(parts)
            
            if attachment_id:
                json_data = self.get_attachment(message_id, attachment_id)
                try:
                    return json.loads(json_data.decode('utf-8'))
                except UnicodeDecodeError:
                    try:
                        return json.loads(json_data.decode('utf-8-sig'))
                    except:
                        return json.loads(json_data.decode('latin-1'))
            
        except Exception as e:
            print(f"Error leyendo JSON del mensaje: {e}")
        
        return None