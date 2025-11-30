#  FacturaFlow - Sistema de Gestión de Facturas Electrónicas

Sistema completo de gestión y análisis de facturas electrónicas con integración a Gmail API, desarrollado con Flask, Docker y MariaDB.

este se creo por la necesidad de no ir a gmail y buscar las facturas una a una por eso que se creo ya que donde trabajo no habia buscado una solucion y ya este es algo sencillo ya llevo unos meses de desarrollo pero ya esta aqui para ser sincera he usado ia para algunas cosa que desconozco pero pero es frotend y de alli todo hay hay bugs que no puedo resolver pero espera en este mes subir esto a vps pero no tengo la economia para pagar un vps pero gracias por tu apoyo 

##  Características
-  Autenticación OAuth2 con Google
-  Integración con Gmail API para extracción automática de facturas
-  Dashboard interactivo con estadísticas y gráficos en tiempo real
-  API REST para gestión de facturas
-  Arquitectura multi-contenedor con Docker
-  Base de datos MariaDB con phpMyAdmin

## Stack Tecnológico

**Backend:**
- Python 3.11
- Flask
- MariaDB
- Gmail API
- OAuth2

**Frontend:**
- HTML5, CSS3, JavaScript
- Chart.js
- Nginx

**DevOps:**
- Docker & Docker Compose
- Gunicorn

##  Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- [Docker](https://www.docker.com/get-started) (versión 20.10 o superior)
- [Docker Compose](https://docs.docker.com/compose/install/) (versión 2.0 o superior)
- [Git](https://git-scm.com/downloads)

## 🔧 Instalación y Configuración

### 1️ Clonar el repositorio

```bash
git clone https://github.com/EliezerBD/docker-test.git
cd docker-test
```

### 2️Configurar variables de entorno

Crea un archivo `config.env` en la raíz del proyecto basándote en el ejemplo:

```bash
cp config.env.example config.env
```

Edita `config.env` y configura las siguientes variables:

```env
# Base de datos
MYSQL_ROOT_PASSWORD=tu_password_root_seguro
DB_NAME=mi_primera_db
DB_USER=tu_usuario
DB_PASSWORD=tu_password_seguro
DB_HOST=db
DB_PORT=3306

# Google OAuth (Gmail API)
GOOGLE_CLIENT_ID=tu_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu_client_secret

# Flask
FLASK_ENV=development
SECRET_KEY=genera_una_clave_secreta_aleatoria
```

###  Configurar Google OAuth (Gmail API)

Para usar la integración con Gmail, necesitas crear credenciales de OAuth2:

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la **Gmail API**
4. Ve a **Credenciales** → **Crear credenciales** → **ID de cliente de OAuth 2.0**
5. Configura la pantalla de consentimiento
6. Agrega las URIs de redirección autorizadas:
   - `http://localhost:5000/oauth2callback`
7. Descarga el archivo JSON de credenciales y guárdalo como `credentials.json` en la raíz del proyecto
8. Copia el `Client ID` y `Client Secret` a tu archivo `config.env`

> **Nota:** El archivo `credentials.json` NO se sube a Git por seguridad (está en `.gitignore`)

### 4️ Construir y ejecutar con Docker

```bash
# Navega a la carpeta de Docker
cd docker

# Construye e inicia todos los contenedores
docker-compose up -d --build
```

Esto iniciará 4 servicios:
- **API Flask** → http://localhost:5000
- **phpMyAdmin** → http://localhost:8080
- **Dashboard Frontend** → http://localhost:8082
- **Base de datos MariaDB** (puerto interno 3306)

### 5️ Verificar que todo funciona

```bash
# Ver el estado de los contenedores
docker-compose ps

# Ver los logs
docker-compose logs -f api
```

## Acceso a los Servicios

| Servicio | URL | Descripción |
|----------|-----|-------------|
| **API Backend** | http://localhost:5000 | API REST de Flask |
| **Dashboard** | http://localhost:8082 | Dashboard con estadísticas |
| **phpMyAdmin** | http://localhost:8080 | Administrador de base de datos |

### Credenciales de phpMyAdmin

- **Servidor:** `db`
- **Usuario:** El configurado en `DB_USER` (config.env)
- **Contraseña:** La configurada en `DB_PASSWORD` (config.env)

##  Estructura del Proyecto

```
docker-test/
├── docker/
│   ├── Dockerfile              # Imagen de la API Flask
│   └── docker-compose.yml      # Orquestación de contenedores
├── frontend/
│   ├── Estadisticas/           # Dashboard con gráficos
│   └── dashboard/              # Panel de control
├── routes/
│   ├── api.py                  # Endpoints de la API
│   ├── auth.py                 # Autenticación OAuth
│   └── web.py                  # Rutas web
├── services/
│   ├── GmailService.py         # Servicio de Gmail API
│   ├── DatabaseService.py      # Servicio de base de datos
│   ├── InvoiceProcessor.py     # Procesador de facturas
│   └── container.py            # Contenedor de dependencias
├── app.py                      # Aplicación principal Flask
├── requirements.txt            # Dependencias Python
├── config.env.example          # Ejemplo de configuración
└── README.md                   # Este archivo
```

##  Comandos Útiles de Docker

```bash
# Iniciar los contenedores
docker-compose up -d

# Detener los contenedores
docker-compose down

# Ver logs en tiempo real
docker-compose logs -f

# Reconstruir las imágenes
docker-compose up -d --build

# Reiniciar un servicio específico
docker-compose restart api

# Entrar a un contenedor
docker exec -it mi_api_flask bash

# Ver el estado de los contenedores
docker-compose ps
```

## Base de Datos

La base de datos se crea automáticamente al iniciar los contenedores. Los datos se persisten en la carpeta `datos_db/` (que está en `.gitignore`).

### Esquema de la base de datos

La aplicación crea automáticamente las siguientes tablas:

- `facturas` - Información de las facturas procesadas
- `emisores` - Datos de los emisores
- (Otras tablas según tu esquema)

##  Desarrollo

### Ejecutar en modo desarrollo

```bash
cd docker
docker-compose up
```

Los cambios en el código se reflejarán automáticamente gracias a los volúmenes montados.

### Agregar nuevas dependencias Python

1. Edita `requirements.txt`
2. Reconstruye la imagen:
   ```bash
   docker-compose up -d --build api
   ```

## Solución de Problemas

### Los contenedores no inician

```bash
# Verifica los logs
docker-compose logs

# Verifica que los puertos no estén ocupados
netstat -an | findstr "5000 8080 8082"  # Windows
lsof -i :5000,8080,8082                 # Linux/Mac
```

### Error de conexión a la base de datos

1. Verifica que el contenedor `db` esté corriendo: `docker-compose ps`
2. Revisa las credenciales en `config.env`
3. Espera unos segundos a que MariaDB termine de inicializar

### Error de OAuth / Gmail API

1. Verifica que `credentials.json` esté en la raíz del proyecto
2. Confirma que las URIs de redirección estén configuradas en Google Cloud Console
3. Revisa que `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` estén en `config.env`

##  Notas de Seguridad


## Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Haz fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

##  Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

##  Autor

**Eliezer Beltrán**

- GitHub: [@EliezerBD](https://github.com/EliezerBD)
- Email: eliezerdba@gmail.com

##  Agradecimientos

- Flask Documentation
- Docker Documentation
- Google Gmail API
- Chart.js


⭐ Si este proyecto te fue útil, no olvides darle una estrella en GitHub!
