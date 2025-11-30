// Variables globales para los gráficos
let docTypeChart, trendChart;

// Colores para los gráficos
const chartColors = [
    '#4361ee',
    '#4cc9f0',
    '#f72585',
    '#7209b7',
    '#3a0ca3',
    '#f15bb5',
    '#00bbf9',
    '#00f5d4'
];

// Función para cargar datos del backend
async function loadDashboardData() {
    try {
        const response = await fetch('/api/dashboard-stats');

        if (!response.ok) {
            throw new Error('Error al cargar datos del dashboard');
        }

        const data = await response.json();

        if (data.success) {
            // Actualizar tarjetas de estadísticas
            updateStatCards(data);

            // Actualizar gráficos
            updateCharts(data);

            // Actualizar actividad reciente
            updateRecentActivity(data.recent_activity);

            showNotification('Datos cargados correctamente');
        } else {
            throw new Error(data.error || 'Error desconocido');
        }
    } catch (error) {
        console.error('Error cargando datos:', error);
        showNotification('Error al cargar datos. Usando datos de ejemplo.', 5000);
        // Mantener los datos de ejemplo si hay error
    }
}

// Actualizar tarjetas de estadísticas
function updateStatCards(data) {
    const cards = document.querySelectorAll('.stat-card-value');

    if (cards.length >= 4) {
        // Salidas Totales (total_amount)
        cards[0].textContent = `$${data.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        // Documentos Procesados (total_docs)
        cards[1].textContent = data.total_docs.toLocaleString();

        // Cargos Recurrentes (recurring_count)
        cards[2].textContent = data.recurring_count.toLocaleString();

        // Gasto en Materiales (current_month_amount)
        cards[3].textContent = `$${data.current_month_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
}

// Actualizar gráficos con datos reales
function updateCharts(data) {
    // Actualizar gráfico de distribución por tipo
    if (docTypeChart && data.by_type && data.by_type.length > 0) {
        const labels = data.by_type.map(item => item.tipo);
        const values = data.by_type.map(item => item.count);
        const colors = chartColors.slice(0, data.by_type.length);

        docTypeChart.data.labels = labels;
        docTypeChart.data.datasets[0].data = values;
        docTypeChart.data.datasets[0].backgroundColor = colors;
        docTypeChart.update('none');

        // Regenerar leyenda
        generateLegend(docTypeChart, 'docTypeLegend');
    }

    // Actualizar gráfico de tendencias
    if (trendChart && data.trends && data.trends.length > 0) {
        const labels = data.trends.map(item => item.month);
        const amounts = data.trends.map(item => parseFloat(item.total));

        trendChart.data.labels = labels;
        trendChart.data.datasets = [{
            label: 'Gastos Mensuales',
            data: amounts,
            backgroundColor: 'rgba(67, 97, 238, 0.1)',
            borderColor: '#4361ee',
            borderWidth: 3,
            tension: 0.4,
            fill: true
        }];
        trendChart.update('none');

        // Regenerar leyenda
        generateLegend(trendChart, 'trendLegend');
    }
}

// Actualizar actividad reciente
function updateRecentActivity(activities) {
    if (!activities || activities.length === 0) return;

    const activityList = document.getElementById('activityList');
    activityList.innerHTML = '';

    activities.forEach(activity => {
        const li = document.createElement('li');
        li.className = 'activity-item';
        li.setAttribute('data-type', 'factura');

        // Formatear fecha
        const date = new Date(activity.fecha_emision);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let timeText = '';
        if (diffDays === 0) {
            timeText = 'Hoy';
        } else if (diffDays === 1) {
            timeText = 'Hace 1 día';
        } else if (diffDays < 30) {
            timeText = `Hace ${diffDays} días`;
        } else {
            timeText = date.toLocaleDateString('es-ES');
        }

        li.innerHTML = `
            <div class="activity-icon factura">
                <i class="fas fa-file-invoice-dollar"></i>
            </div>
            <div class="activity-details">
                <div class="activity-title">${activity.tipo} - ${activity.codigo_generacion.substring(0, 8)}...</div>
                <div class="activity-meta">
                    <span><i class="fas fa-building"></i> ${activity.nombre_emisor}</span>
                    <span><i class="far fa-clock"></i> ${timeText}</span>
                </div>
            </div>
            <div class="activity-amount">$${activity.total_pagar.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        `;

        activityList.appendChild(li);
    });
}

// Inicializar gráficos con datos de ejemplo
function initializeCharts() {
    // Datos de ejemplo iniciales
    const docTypeData = {
        labels: ['Materiales e Insumos', 'Equipos y Herramientas', 'Gasolina', 'Otros'],
        datasets: [{
            data: [45, 30, 15, 10],
            backgroundColor: chartColors.slice(0, 4),
            borderWidth: 0
        }]
    };

    const trendData = {
        labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul'],
        datasets: [{
            label: 'Gastos Mensuales',
            data: [65, 59, 80, 81, 56, 55, 70],
            backgroundColor: 'rgba(67, 97, 238, 0.1)',
            borderColor: '#4361ee',
            borderWidth: 3,
            tension: 0.4,
            fill: true
        }]
    };

    // Gráfico de distribución por tipo de documento
    const docTypeCtx = document.getElementById('docTypeChart').getContext('2d');
    docTypeChart = new Chart(docTypeCtx, {
        type: 'doughnut',
        data: docTypeData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });

    // Gráfico de tendencia mensual
    const trendCtx = document.getElementById('trendChart').getContext('2d');
    trendChart = new Chart(trendCtx, {
        type: 'line',
        data: trendData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return `${context.dataset.label}: $${context.parsed.y.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        drawBorder: false
                    },
                    ticks: {
                        precision: 0,
                        callback: function (value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });

    // Generate custom legends
    generateLegend(docTypeChart, 'docTypeLegend');
    generateLegend(trendChart, 'trendLegend');
}

// Function to generate custom HTML legend
function generateLegend(chart, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = ''; // Clear previous legend

    const items = chart.data.datasets[0].data.map((data, index) => {
        // For line charts with multiple datasets, we iterate over datasets instead
        if (chart.config.type === 'line') {
            return chart.data.datasets[index];
        }
        return {
            text: chart.data.labels[index],
            fillStyle: chart.data.datasets[0].backgroundColor[index],
            hidden: false,
            index: index
        };
    });

    // Handle line chart specifically (iterating over datasets)
    if (chart.config.type === 'line') {
        chart.data.datasets.forEach((dataset, index) => {
            const item = document.createElement('div');
            item.className = 'legend-item';

            const colorBox = document.createElement('span');
            colorBox.className = 'legend-color';
            colorBox.style.backgroundColor = dataset.borderColor;

            const text = document.createTextNode(dataset.label);

            item.appendChild(colorBox);
            item.appendChild(text);

            item.onclick = () => {
                const meta = chart.getDatasetMeta(index);
                meta.hidden = meta.hidden === null ? !chart.data.datasets[index].hidden : null;

                if (meta.hidden) {
                    item.classList.add('hidden');
                } else {
                    item.classList.remove('hidden');
                }

                chart.update();
            };

            container.appendChild(item);
        });
        return;
    }

    // Handle doughnut/pie chart (iterating over data points)
    items.forEach(legendItem => {
        const item = document.createElement('div');
        item.className = 'legend-item';

        const colorBox = document.createElement('span');
        colorBox.className = 'legend-color';
        colorBox.style.backgroundColor = legendItem.fillStyle;

        const text = document.createTextNode(legendItem.text);

        item.appendChild(colorBox);
        item.appendChild(text);

        item.onclick = () => {
            chart.toggleDataVisibility(legendItem.index);
            item.classList.toggle('hidden');
            chart.update();
        };

        container.appendChild(item);
    });
}

// Función para mostrar notificación
function showNotification(message, duration = 3000) {
    const notification = document.getElementById('notification');
    const messageElement = document.getElementById('notificationMessage');

    messageElement.textContent = message;
    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, duration);
}

// Función para filtrar actividad
function filterActivity() {
    const filterValue = document.getElementById('activityFilter').value;
    const searchValue = document.getElementById('activitySearch').value.toLowerCase();
    const activityItems = document.querySelectorAll('.activity-item');
    let visibleItems = 0;

    activityItems.forEach(item => {
        const type = item.getAttribute('data-type');
        const title = item.querySelector('.activity-title').textContent.toLowerCase();
        const company = item.querySelector('.activity-meta span:first-child').textContent.toLowerCase();

        const typeMatch = filterValue === 'all' || type === filterValue;
        const searchMatch = searchValue === '' ||
            title.includes(searchValue) ||
            company.includes(searchValue);

        if (typeMatch && searchMatch) {
            item.style.display = 'flex';
            visibleItems++;
        } else {
            item.style.display = 'none';
        }
    });

    // Mostrar estado vacío si no hay resultados
    const activityList = document.getElementById('activityList');
    let emptyState = activityList.querySelector('.empty-state');

    if (visibleItems === 0) {
        if (!emptyState) {
            emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = `
                <i class="fas fa-search"></i>
                <h3>No se encontraron resultados</h3>
                <p>Intenta con otros términos de búsqueda o ajusta los filtros</p>
            `;
            activityList.appendChild(emptyState);
        }
    } else if (emptyState) {
        emptyState.remove();
    }
}

// Función para actualizar datos en tiempo real
function updateRealTimeData() {
    // Cargar datos reales del backend
    loadDashboardData();
}

// Sidebar toggle functionality
document.getElementById('sidebarToggle').addEventListener('click', function () {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const overlay = document.getElementById('sidebarOverlay');

    sidebar.classList.toggle('collapsed');
    mainContent.classList.toggle('expanded');

    // Solo activar overlay en móvil/tablet (menos de 768px)
    if (window.innerWidth <= 768) {
        overlay.classList.toggle('active');
    }
});

// Close sidebar when clicking overlay (mobile)
document.getElementById('sidebarOverlay').addEventListener('click', function () {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const overlay = document.getElementById('sidebarOverlay');

    sidebar.classList.add('collapsed');
    mainContent.classList.add('expanded');
    overlay.classList.remove('active');
});

// Close sidebar button (mobile)
document.getElementById('sidebarClose').addEventListener('click', function () {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const overlay = document.getElementById('sidebarOverlay');

    sidebar.classList.add('collapsed');
    mainContent.classList.add('expanded');
    overlay.classList.remove('active');
});

// Event Listeners
document.getElementById('activityFilter').addEventListener('change', filterActivity);
document.getElementById('activitySearch').addEventListener('input', filterActivity);
document.getElementById('timeRange').addEventListener('change', function () {
    showNotification(`Período cambiado a: ${this.options[this.selectedIndex].text}`);
});
document.getElementById('docTypeFilter').addEventListener('change', function () {
    showNotification(`Filtro aplicado: ${this.options[this.selectedIndex].text}`);
});

// Inicializar la aplicación
window.onload = function () {
    initializeCharts();

    // Cargar datos reales del backend
    loadDashboardData();

    // Actualizar datos en tiempo real cada 30 segundos
    setInterval(updateRealTimeData, 30000);

    // Mostrar notificación de bienvenida
    setTimeout(() => {
        showNotification('Bienvenido al Dashboard de FacturaFlow');
    }, 1000);
};
