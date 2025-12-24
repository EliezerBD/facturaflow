# FacturaFlow - Gestión de Facturas DTE EN EL SALVADOR

FacturaFlow nació de una necesidad real: en mi trabajo perdía demasiado tiempo buscando facturas una por una en Gmail. Como no había una solución a la mano, decidí crear este sistema para automatizar todo el proceso.

Llevo unos meses desarrollándolo y, aunque he usado IA para algunas partes (especialmente en el frontend) y todavía tengo algunos bugs por pulir, ya es una herramienta funcional que me ahorra mucho trabajo. Mi meta es subirlo pronto a un VPS para que sea más estable.

### ¿Qué ofrece FacturaFlow?
- **Conexión con Gmail:** Extrae automáticamente tus facturas usando la API de Google sin que tengas que buscarlas manualmente.
- **Dashboard Visual:** Gráficos y estadísticas en tiempo real para entender tus gastos de un vistazo.
- **Todo en Orden:** Una base de datos (MariaDB) que organiza toda la información y una API para gestionarla.
- **Listo para Docker:** Todo corre en contenedores, lo que facilita que funcione en cualquier lugar.

---

##  Mi Stack Tecnológico
- **Backend:** Python (Flask) + MariaDB.
- **Frontend:** HTML, CSS, JavaScript y Chart.js para los gráficos.
- **Infraestructura:** Docker y Nginx para el despliegue.

---

##  Cómo probarlo (Docker)
Si tienes Docker, puedes levantarlo en segundos:
1. Configura tu `config.env` y `credentials.json` (API de Google).
2. Ejecuta:
```bash
docker-compose up -d --build
```
*   **API:** http://localhost:5000
*   **Dashboard:** http://localhost:8082

---
*Este proyecto es parte de mi aprendizaje constante como desarrollador. ¡Gracias por el apoyo!*
*Creado por [Eliezer Beltrán](https://github.com/EliezerBD)*
