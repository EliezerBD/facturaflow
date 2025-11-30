# 1. Empezamos con una imagen oficial de Python
FROM python:3.11-slim

# 2. Creamos una carpeta 'app' dentro del contenedor
WORKDIR /app

# 3. Copiamos la "lista de ingredientes"
COPY requirements.txt .

# 4. Instalamos todos los ingredientes
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copiamos todo lo demás
COPY . .

# --- SEGURIDAD: Usuario No-Root ---
# Creamos un usuario llamado 'appuser' para no usar root
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

# 6. Definimos el comando para encender la app
# --- SEGURIDAD Y RENDIMIENTO: Usamos Gunicorn ---
# 4 workers, timeout de 120s, bindeado a 0.0.0.0:5000
CMD ["gunicorn", "--workers=4", "--bind=0.0.0.0:5000", "--timeout=120", "app:app"]