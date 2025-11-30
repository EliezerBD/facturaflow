import mysql.connector

class InvoiceProcessor:
    def __init__(self, gmail_service, database_service):
        self.gmail_service = gmail_service
        self.database_service = database_service
    
    def process_invoices(self, query="is:unread has:attachment filename:.json", max_results=100):
        """Procesa facturas desde Gmail y las guarda en la base de datos"""
        print("--- Iniciando Procesamiento de Facturas (OPTIMIZADO) ---")
        
        # 1. Buscar IDs de mensajes
        messages = self.gmail_service.search_emails(query, max_results)
        print(f"📧 Correos encontrados: {len(messages)}")
        
        results = {
            'nuevas': 0,
            'duplicadas': 0,
            'errores': 0,
            'detalles': {
                'procesadas': [],
                'omitidas': []
            }
        }
        
        if not messages:
            self._print_summary(results)
            return results

        # 2. Descargar detalles en lote (Batch Request)
        message_ids = [msg['id'] for msg in messages]
        print(f"📥 Descargando detalles de {len(message_ids)} correos en una sola petición...")
        messages_details = self.gmail_service.get_messages_batch(message_ids)
        
        # 3. Procesar mensajes en memoria
        for msg_id, message_data in messages_details.items():
            try:
                if not message_data:
                    continue
                    
                subject = self._get_header(message_data.get('payload', {}).get('headers', []), 'Subject')
                
                # Extraer JSON de la factura (pasando el objeto ya descargado)
                invoice_data = self.gmail_service.get_json_from_message(message_data)
                if not invoice_data:
                    results['detalles']['omitidas'].append(f"{subject} - SIN JSON VÁLIDO")
                    continue
                
                # Extraer datos importantes
                invoice_info = self._extract_invoice_data(invoice_data)
                if not invoice_info or not invoice_info['codigo_generacion']:
                    results['detalles']['omitidas'].append(f"{subject} - SIN CÓDIGO VÁLIDO")
                    continue
                
                # Verificar si ya existe
                if self.database_service.invoice_exists(invoice_info['codigo_generacion']):
                    results['duplicadas'] += 1
                    results['detalles']['omitidas'].append(
                        f"{invoice_info['codigo_generacion']} - {invoice_info['nombre_emisor']} - DUPLICADA"
                    )
                else:
                    # Guardar nueva factura
                    self.database_service.save_invoice(
                        invoice_info['codigo_generacion'],
                        invoice_info['fecha_emision'],
                        invoice_info['nombre_emisor'],
                        invoice_info['total_pagar'],
                        invoice_info['tipo_dte']
                    )
                    results['nuevas'] += 1
                    results['detalles']['procesadas'].append(
                        f"{invoice_info['codigo_generacion']} - {invoice_info['nombre_emisor']} - ${invoice_info['total_pagar']}"
                    )
                    
            except mysql.connector.Error as err:
                if err.errno == 1062:  # Duplicado
                    results['duplicadas'] += 1
                    results['detalles']['omitidas'].append(f"{invoice_info['codigo_generacion']} - DUPLICADA (SQL)")
                else:
                    results['errores'] += 1
                    results['detalles']['omitidas'].append(f"ERROR BD: {err}")
            except Exception as e:
                results['errores'] += 1
                results['detalles']['omitidas'].append(f"ERROR: {e}")
        
        self._print_summary(results)
        return results
    
    def _extract_invoice_data(self, invoice_data):
        """Extrae los datos importantes del JSON de factura"""
        ident = invoice_data.get('identificacion', {})
        emisor = invoice_data.get('emisor', {})
        resumen = invoice_data.get('resumen', {})
        
        return {
            'codigo_generacion': ident.get('codigoGeneracion'),
            'fecha_emision': ident.get('fecEmi'),
            'nombre_emisor': emisor.get('nombre'),
            'total_pagar': resumen.get('totalPagar'),
            'tipo_dte': ident.get('tipoDte')
        }
    
    def _get_header(self, headers, name):
        """Obtiene un header específico del mensaje"""
        return next((h['value'] for h in headers if h['name'] == name), 'Desconocido')
    
    def _print_summary(self, results):
        """Imprime resumen del procesamiento"""
        print("\n" + "="*50)
        print("📊 RESUMEN DE PROCESAMIENTO")
        print("="*50)
        print(f"✅ NUEVAS: {results['nuevas']}")
        print(f"🔄 DUPLICADAS: {results['duplicadas']}")
        print(f"❌ ERRORES: {results['errores']}")
        print("\n📋 FACTURAS PROCESADAS:")
        for factura in results['detalles']['procesadas']:
            print(f"   ✅ {factura}")
        print("\n📋 FACTURAS OMITIDAS:")
        for factura in results['detalles']['omitidas']:
            print(f"   ❌ {factura}")
        print("="*50)