class GmailDownloader {
    constructor() {
        this.correctPassword = "78945coe"; // Tu contraseña local
        this.isAuthenticated = false; 
        
        // ### CAMBIO DE SEGURIDAD ###
        // Ya no almacenamos el token ni el state en el frontend.
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkAuthStatus(); // Revisa si acabamos de volver de Google
    }

    bindEvents() {
        document.getElementById('password-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.checkAccess();
        });
        
        document.getElementById('search-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchFiles();
        });
    }

    // ### CAMBIO DE SEGURIDAD ###
    // Esta función solo revisa si la URL contiene #auth_success
    parseHashParams() {
        const hash = window.location.hash.substring(1); // Quitar el '#'
        return {
            authSuccess: hash.startsWith('auth_success')
        };
    }

    // ### CAMBIO DE SEGURIDAD ###
    // Ya no maneja tokens, solo el estado de la UI
    checkAuthStatus() {
        console.log('Verificando estado de autenticación...');
        
        const { authSuccess } = this.parseHashParams();

        if (authSuccess) {
            // Caso 1: El usuario acaba de regresar de Google
            console.log('Autenticación de Google detectada en la URL.');
            
            this.showMainApp(); // Mostrar la app principal
            
            // Limpiar la URL para que no se vea el #auth_success
            history.replaceState(null, null, ' ');
            this.showNotification('✅ Conectado a Gmail correctamente', 'success');

        } else {
            // Caso 2: El usuario está recargando la página
            console.log('No se detectó callback de Google. Esperando acción.');
        }
    }

    async connectGmail() {
        try {
            this.showNotification('Conectando con Google...', 'info');
            
            const response = await fetch('/auth/google');
            const data = await response.json();
            
            if (data.authUrl && data.state) {
                window.location.href = data.authUrl;
            } else {
                this.showNotification('Error al conectar con Google', 'error');
            }
        } catch (error) {
            this.showNotification('Error de conexión con el servidor', 'error');
            console.error('Error:', error);
        }
    }

    checkAccess() {
        const passwordInput = document.getElementById('password-input');
        const enteredPassword = passwordInput?.value.trim();

        if (enteredPassword === this.correctPassword) {
            this.showMainApp();
            this.showNotification('✅ Acceso concedido', 'success');
        } else {
            this.showNotification('❌ Contraseña incorrecta', 'error');
            if (passwordInput) passwordInput.value = '';
        }
    }

    showMainApp() {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('main-screen').classList.remove('hidden');
    }

    // --- NUEVA LÓGICA PARA EL BOTÓN DE SINCRONIZAR ---
    async processInvoices() {
        const btn = document.getElementById('btn-sync');
        const statusDiv = document.getElementById('sync-status');
        const originalBtnText = btn.innerHTML;

        // 1. Estado de Carga (Visual)
        btn.disabled = true;
        btn.classList.add('opacity-75', 'cursor-not-allowed');
        btn.innerHTML = `
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Procesando...
        `;

        statusDiv.classList.remove('hidden', 'bg-red-50', 'text-red-700', 'bg-green-50', 'text-green-700');
        statusDiv.classList.add('mt-4', 'bg-blue-50', 'text-blue-700', 'p-3', 'rounded-lg', 'text-sm', 'text-center');
        statusDiv.innerHTML = "📡 Conectando con el servidor...";

        try {
            // 2. Llamada al Backend
            const response = await fetch('/api/process-invoices', { method: 'POST' });
            const data = await response.json();

            // 3. Manejo de Respuesta
            if (data.success) {
                this.showNotification('✅ Sincronización finalizada', 'success');
                
                // Estilo de éxito para el mensaje
                statusDiv.classList.remove('bg-blue-50', 'text-blue-700');
                statusDiv.classList.add('bg-green-50', 'text-green-800', 'border', 'border-green-200');
                
                statusDiv.innerHTML = `
                    <div class="flex justify-center gap-6">
                        <div class="font-bold">📥 Nuevas: ${data.nuevas}</div>
                        <div class="text-gray-600">🔄 Duplicadas: ${data.duplicadas}</div>
                        <div class="text-red-500">⚠️ Errores: ${data.errores}</div>
                    </div>
                `;

                // Si encontró correos nuevos, refrescamos la lista de abajo automáticamente
                if (data.nuevas > 0) {
                    setTimeout(() => this.searchFiles(), 1000);
                }

            } else {
                throw new Error(data.error || 'Error desconocido');
            }

        } catch (error) {
            console.error(error);
            this.showNotification('Error al procesar facturas', 'error');
            
            // Estilo de error
            statusDiv.classList.remove('bg-blue-50', 'text-blue-700');
            statusDiv.classList.add('bg-red-50', 'text-red-700', 'border', 'border-red-200');
            statusDiv.innerHTML = `❌ Error: ${error.message}`;
        } finally {
            // 4. Restaurar Botón
            setTimeout(() => {
                btn.disabled = false;
                btn.classList.remove('opacity-75', 'cursor-not-allowed');
                btn.innerHTML = originalBtnText;
            }, 500);
        }
    }
    // --- FIN NUEVA LÓGICA ---

    async searchFiles() {
        const searchTerm = document.getElementById('search-input').value;
        const fileType = document.getElementById('file-type').value;
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;

        try {
            this.showLoading();
            console.log('Enviando búsqueda al backend (sin token)...');
            
            const response = await fetch('/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    search: searchTerm,
                    startDate: startDate,
                    endDate: endDate,
                    fileType: fileType 
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.displayEmails(data.emails);
                const message = searchTerm ? 
                    `Encontrados ${data.total} resultados para "${searchTerm}"` :
                    `Mostrando ${data.total} emails`;
                this.showNotification(message, 'success');
            } else {
                this.showNotification(data.error || 'Error en la búsqueda', 'error');
                if (response.status === 401) {
                    this.logout();
                }
            }
        } catch (error) {
            this.showNotification('Error de conexión', 'error');
            console.error('Error:', error);
        }
    }

    displayEmails(emails) {
        const resultsContainer = document.getElementById('results-list');
        const resultsCount = document.getElementById('results-count');
        
        resultsCount.textContent = emails.length;
        
        if (emails.length === 0) {
            resultsContainer.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <svg class="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <p class="mt-2">No se encontraron emails</p>
                </div>
            `;
            return;
        }

        resultsContainer.innerHTML = emails.map(email => {
            const firstAttachment = email.attachments[0] || {};
            const fileName = firstAttachment.filename || '';
            const isPdf = fileName.toLowerCase().endsWith('.pdf');
            const isJson = fileName.toLowerCase().endsWith('.json');
            
            return `
            <div class="file-item border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 transition-colors">
                <div class="flex items-center">
                    <input type="checkbox" class="file-checkbox w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500" 
                           data-email='${JSON.stringify(email)}'>
                    <div class="file-info ml-3 flex-1">
                        <div class="file-name font-semibold text-blue-600 flex items-center gap-2">
                            ${email.attachments.length > 0 ? 
                                (isPdf ? 
                                    '<svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z"/></svg>' : 
                                (isJson ?
                                    '<svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/></svg>' :
                                    '<svg class="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20"><path d="M8 4a2 2 0 00-2 2v10a2 2 0 002 2h4a2 2 0 002-2V6a2 2 0 00-2-2H8z"/></svg>')
                                ) :
                                '<svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>'
                            }
                            ${email.subject}
                        </div>
                        <div class="file-meta text-sm text-gray-600 mt-1">
                            <strong>De:</strong> ${email.from} | 
                            <strong>Fecha:</strong> ${email.date}
                        </div>
                        <div class="file-snippet text-xs text-gray-500 mt-1">
                            ${email.snippet}
                        </div>
                        <div class="file-attachments text-xs text-gray-700 mt-2">
                            <strong>Adjuntos:</strong> 
                            ${email.attachments.map(att => 
                                `<span class="ml-1 inline-block bg-gray-200 rounded px-1.5 py-0.5">${att.filename}</span>`
                            ).join('')}
                        </div>
                    </div>
                </div>
            </div>
            `}).join('');

        document.querySelectorAll('.file-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const fileItem = e.target.closest('.file-item');
                if (e.target.checked) {
                    fileItem.classList.add('bg-blue-50', 'border-blue-300');
                } else {
                    fileItem.classList.remove('bg-blue-50', 'border-blue-300');
                }
            });
        });
    }

    async downloadSelected() {
        const selectedCheckboxes = document.querySelectorAll('.file-checkbox:checked');
        
        if (selectedCheckboxes.length === 0) {
            this.showNotification('Selecciona al menos un archivo', 'error');
            return;
        }

        const selectedEmails = Array.from(selectedCheckboxes).map(checkbox => 
            JSON.parse(checkbox.dataset.email)
        );

        this.downloadAsZip(selectedEmails);
    }

    async downloadAsZip(emails) {
        this.showNotification(`Preparando ZIP con ${emails.length} email(s)...`, 'info');

        try {
            const response = await fetch('/api/download-batch', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ emails: emails })
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'facturas_descargadas.zip';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                
                this.showNotification(`✅ ZIP descargado con éxito`, 'success');
            } else {
                const errorData = await response.json();
                this.showNotification(errorData.error || 'Error al descargar ZIP', 'error');
                if (response.status === 401) {
                    this.logout();
                }
            }
        } catch (error) {
            this.showNotification('Error al descargar ZIP', 'error');
        }
    }
    
    logout() {
        fetch('/auth/logout', { method: 'POST' });
        this.showNotification('Sesión expirada. Por favor, conecta de nuevo.', 'error');
        location.reload();
    }

    selectAll() {
        document.querySelectorAll('.file-checkbox').forEach(checkbox => {
            checkbox.checked = true;
            checkbox.closest('.file-item').classList.add('bg-blue-50', 'border-blue-300');
        });
        this.showNotification('Todos los emails seleccionados', 'info');
    }

    clearSelection() {
        document.querySelectorAll('.file-checkbox').forEach(checkbox => {
            checkbox.checked = false;
            checkbox.closest('.file-item').classList.remove('bg-blue-50', 'border-blue-300');
        });
        this.showNotification('Selección limpiada', 'info');
    }

    showLoading() {
        document.getElementById('results-list').innerHTML = `
            <div class="text-center py-8">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p class="mt-2 text-gray-600">Cargando emails...</p>
            </div>
        `;
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        
        const notification = document.createElement('div');
        notification.className = `flex w-full max-w-sm overflow-hidden bg-white rounded-lg shadow-md ${
            type === 'success' ? 'border-l-4 border-green-500' :
            type === 'error' ? 'border-l-4 border-red-500' :
            'border-l-4 border-blue-500'
        }`;
        
        notification.innerHTML = `
            <div class="flex items-center justify-center w-12 ${
                type === 'success' ? 'bg-green-500' :
                type === 'error' ? 'bg-red-500' :
                'bg-blue-500'
            }">
                <svg class="w-6 h-6 text-white fill-current" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                    ${
                        type === 'success' ? 
                        '<path d="M20 3.33331C10.8 3.33331 3.33337 10.8 3.33337 20C3.33337 29.2 10.8 36.6666 20 36.6666C29.2 36.6666 36.6667 29.2 36.6667 20C36.6667 10.8 29.2 3.33331 20 3.33331ZM16.6667 28.3333L8.33337 20L10.6834 17.65L16.6667 23.6166L29.3167 10.9666L31.6667 13.3333L16.6667 28.3333Z"/>' :
                        type === 'error' ?
                        '<path d="M20 3.36667C10.8167 3.36667 3.3667 10.8167 3.3667 20C3.3667 29.1833 10.8167 36.6333 20 36.6333C29.1834 36.6333 36.6334 29.1833 36.6334 20C36.6334 10.8167 29.1834 3.36667 20 3.36667ZM19.1334 33.3333V22.9H13.3334L21.6667 6.66667V17.1H27.25L19.1334 33.3333Z"/>' :
                        '<path d="M20 3.33331C10.8 3.33331 3.33337 10.8 3.33337 20C3.33337 29.2 10.8 36.6666 20 36.6666C29.2 36.6666 36.6667 29.2 36.6667 20C36.6667 10.8 29.2 3.33331 20 3.33331ZM21.6667 28.3333H18.3334V25H21.6667V28.3333ZM21.6667 21.6666H18.3334V11.6666H21.6667V21.6666Z"/>'
                    }
                </svg>
            </div>
            <div class="px-4 py-2 -mx-3">
                <div class="mx-3">
                    <span class="font-semibold ${
                        type === 'success' ? 'text-green-500' :
                        type === 'error' ? 'text-red-500' :
                        'text-blue-500'
                    }">
                        ${type === 'success' ? 'Éxito' : type === 'error' ? 'Error' : 'Información'}
                    </span>
                    <p class="text-sm text-gray-600">${message}</p>
                </div>
            </div>
        `;
        
        container.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }
}

// Funciones globales
function connectGmail() { window.downloader.connectGmail(); }
function checkAccess() { window.downloader.checkAccess(); }
function searchFiles() { window.downloader.searchFiles(); }
function downloadSelected() { window.downloader.downloadSelected(); }
function selectAll() { window.downloader.selectAll(); }
function clearSelection() { window.downloader.clearSelection(); }
// --- AQUÍ ESTÁ LA NUEVA FUNCIÓN GLOBAL ---
function processInvoices() { window.downloader.processInvoices(); }

document.addEventListener('DOMContentLoaded', () => {
    window.downloader = new GmailDownloader();
});