import os
from dotenv import load_dotenv
from .GmailService import GmailService
from .DatabaseService import DatabaseService
from .InvoiceProcessor import InvoiceProcessor

# Cargar configuración
load_dotenv('config.env')

# Configuración
CLIENT_ID = os.getenv('CLIENT_ID')
CLIENT_SECRET = os.getenv('CLIENT_SECRET')
REDIRECT_URI = 'http://localhost:5000/auth/callback' 

# Inicializar instancias (Singleton)
# Al importar estas variables desde otros archivos, siempre usaremos las mismas instancias
gmail_service = GmailService(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)

db_service = DatabaseService(
    host=os.getenv('DB_HOST', 'localhost'),
    port=os.getenv('DB_PORT', '3306'),
    user=os.getenv('DB_USER', 'root'),
    password=os.getenv('DB_PASSWORD'),
    database=os.getenv('DB_NAME')
)

invoice_processor = InvoiceProcessor(gmail_service, db_service)
