import mysql.connector

class DatabaseService:
    def __init__(self, host, port, user, password, database):
        self.host = host
        self.port = port
        self.user = user
        self.password = password
        self.database = database
        self.connection = None
    
    def connect(self):
        """Establece conexión a la base de datos"""
        try:
            self.connection = mysql.connector.connect(
                host=self.host,
                port=self.port,
                user=self.user,
                password=self.password,
                database=self.database
            )
            return self.connection
        except mysql.connector.Error as e:
            print(f"Error conectando a la base de datos: {e}")
            return None
    
    def disconnect(self):
        """Cierra la conexión"""
        if self.connection:
            self.connection.close()

    def create_tables(self):
        """Crea las tablas necesarias si no existen"""
        try:
            # Asegurar conexión
            if not self.connection or not self.connection.is_connected():
                if not self.connect():
                    return False
            
            cursor = self.connection.cursor()
            
            # Tabla facturas
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS facturas (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    codigo_generacion VARCHAR(100) NOT NULL UNIQUE,
                    fecha_emision DATE,
                    nombre_emisor VARCHAR(255),
                    total_pagar DECIMAL(10, 2),
                    tipo_dte VARCHAR(10),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            """)
            
            self.connection.commit()
            print("✅ Tablas verificadas/creadas correctamente")
            cursor.close()
            return True
        except mysql.connector.Error as e:
            print(f"❌ Error creando tablas: {e}")
            return False
    
    def invoice_exists(self, codigo_generacion):
        """Verifica si una factura ya existe"""
        cursor = self.connection.cursor()
        cursor.execute("SELECT id FROM facturas WHERE codigo_generacion = %s", (codigo_generacion,))
        exists = cursor.fetchone() is not None
        cursor.close()
        return exists
    
    def save_invoice(self, codigo_generacion, fecha_emision, nombre_emisor, total_pagar, tipo_dte):
        """Guarda una nueva factura en la base de datos"""
        cursor = self.connection.cursor()
        try:
            sql = """
                INSERT INTO facturas 
                (codigo_generacion, fecha_emision, nombre_emisor, total_pagar, tipo_dte) 
                VALUES (%s, %s, %s, %s, %s)
            """
            cursor.execute(sql, (codigo_generacion, fecha_emision, nombre_emisor, total_pagar, tipo_dte))
            self.connection.commit()
            return True
        except mysql.connector.Error as err:
            self.connection.rollback()
            raise err
        finally:
            cursor.close()

    def get_dashboard_stats(self):
        """Obtiene estadísticas para el dashboard"""
        cursor = self.connection.cursor(dictionary=True)
        stats = {}
        
        try:
            # 1. Totales Generales
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_count,
                    COALESCE(SUM(total_pagar), 0) as total_amount
                FROM facturas
            """)
            totals = cursor.fetchone()
            stats['total_docs'] = totals['total_count']
            stats['total_amount'] = float(totals['total_amount'])

            # 2. Distribución por Tipo de DTE
            cursor.execute("""
                SELECT tipo_dte, COUNT(*) as count 
                FROM facturas 
                GROUP BY tipo_dte
            """)
            stats['by_type'] = cursor.fetchall()

            # 2.5. Gastos por día de la semana
            cursor.execute("""
                SELECT 
                    DAYOFWEEK(fecha_emision) as day_num,
                    DAYNAME(fecha_emision) as day_name,
                    COUNT(*) as count,
                    COALESCE(SUM(total_pagar), 0) as total_amount
                FROM facturas
                WHERE fecha_emision IS NOT NULL
                GROUP BY day_num, day_name
                ORDER BY day_num
            """)
            stats['by_weekday'] = cursor.fetchall()

            # 2.6. Top 5 Emisores
            cursor.execute("""
                SELECT 
                    nombre_emisor,
                    COUNT(*) as count,
                    COALESCE(SUM(total_pagar), 0) as total_amount
                FROM facturas
                WHERE nombre_emisor IS NOT NULL
                GROUP BY nombre_emisor
                ORDER BY total_amount DESC
                LIMIT 5
            """)
            stats['top_emisores'] = cursor.fetchall()

            # 2.7. Gastos del Mes Actual
            cursor.execute("""
                SELECT COALESCE(SUM(total_pagar), 0) as current_month_amount
                FROM facturas
                WHERE MONTH(fecha_emision) = MONTH(NOW())
                AND YEAR(fecha_emision) = YEAR(NOW())
            """)
            current_month = cursor.fetchone()
            stats['current_month_amount'] = float(current_month['current_month_amount'])

            # 2.8. Cargos Recurrentes (Emisores con más de 2 compras)
            cursor.execute("""
                SELECT COUNT(*) as recurring_count
                FROM (
                    SELECT nombre_emisor
                    FROM facturas
                    WHERE nombre_emisor IS NOT NULL
                    GROUP BY nombre_emisor
                    HAVING COUNT(*) > 2
                ) as recurrentes
            """)
            recurring = cursor.fetchone()
            stats['recurring_count'] = recurring['recurring_count']

            # 3. Tendencia Mensual (Últimos 6 meses)
            cursor.execute("""
                SELECT 
                    DATE_FORMAT(fecha_emision, '%Y-%m') as month,
                    tipo_dte,
                    COUNT(*) as count
                FROM facturas
                WHERE fecha_emision >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
                GROUP BY month, tipo_dte
                ORDER BY month ASC
            """)
            stats['trends'] = cursor.fetchall()

            # 4. Actividad Reciente (Últimas 10)
            cursor.execute("""
                SELECT codigo_generacion, fecha_emision, nombre_emisor, total_pagar, tipo_dte
                FROM facturas
                ORDER BY fecha_emision DESC
                LIMIT 10
            """)
            # Convertir fechas a string para JSON
            recent = cursor.fetchall()
            for r in recent:
                if r['fecha_emision']:
                    r['fecha_emision'] = r['fecha_emision'].strftime('%Y-%m-%d')
            stats['recent_activity'] = recent

            return stats

        except mysql.connector.Error as e:
            print(f"Error obteniendo stats: {e}")
            return None
        finally:
            cursor.close()