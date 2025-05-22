document.addEventListener('DOMContentLoaded', function() {
    // Verificar si el usuario está autenticado
    const user = obtenerUsuario();
    const recomendacionesSection = document.getElementById('recomendaciones-section');
    
    if (user && recomendacionesSection) {
        // Mostrar la sección de recomendaciones
        recomendacionesSection.style.display = 'block';
        
        // Cargar las recomendaciones personalizadas
        cargarRecomendaciones();
        
        // Configurar detector de visibilidad para actualizar cuando se regresa a la página
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        // Verificar si necesitamos actualizar (por ejemplo, después de una compra)
        checkForRecommendationRefresh();
    }
});

// Nueva función: Verificar si es necesario actualizar recomendaciones
function checkForRecommendationRefresh() {
    const needsRefresh = localStorage.getItem('needsRecommendationRefresh');
    if (needsRefresh === 'true') {
        console.log('Actualizando recomendaciones después de una acción reciente');
        cargarRecomendaciones();
        // Limpiar el flag después de actualizar
        localStorage.removeItem('needsRecommendationRefresh');
    }
}

// Nueva función: Manejar eventos de visibilidad de la página
function handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
        const lastPageVisited = localStorage.getItem('lastPageVisited');
        const currentTime = new Date().getTime();
        const lastRefreshTime = parseInt(localStorage.getItem('lastRecommendationRefresh') || '0');
        
        // Solo actualizar si venimos de otra página o han pasado más de 5 minutos
        if (lastPageVisited && lastPageVisited !== 'interfaz.html' || 
            currentTime - lastRefreshTime > 5 * 60 * 1000) {
            console.log('Actualizando recomendaciones al volver a la página');
            cargarRecomendaciones();
        }
    }
    
    // Actualizar registro de última página visitada
    localStorage.setItem('lastPageVisited', 'interfaz.html');
}

async function cargarRecomendaciones() {
    const token = localStorage.getItem('token');
    const recomendacionesContainer = document.getElementById('recomendaciones-container');
    const loadingElement = document.getElementById('recomendaciones-loading');
    
    if (!token) {
        if (recomendacionesContainer) {
            recomendacionesContainer.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-info">
                        Inicia sesión para ver recomendaciones personalizadas
                    </div>
                </div>`;
        }
        return;
    }
    
    // Mostrar el spinner de carga si está oculto
    if (loadingElement) {
        loadingElement.style.display = 'block';
    }
    
    try {
        // Llamada a la API para obtener recomendaciones personalizadas
        const response = await fetch('http://localhost:5000/api/recommendations', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        // Registrar el momento de la última actualización
        localStorage.setItem('lastRecommendationRefresh', new Date().getTime());
        
        // Ocultar el loading
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
        
        if (!data.success) {
            throw new Error(data.error || 'Error al cargar las recomendaciones');
        }
        
        // Si no hay pedidos previos, mostrar mensaje especial
        if (!data.hasOrders || !data.recommendations || data.recommendations.length === 0) {
            recomendacionesContainer.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i> Aún no tenemos suficientes datos para generar recomendaciones personalizadas. 
                        ¡Realiza tu primer pedido y personaliza tu experiencia!
                    </div>
                </div>`;
            return;
        }
        
        // Mostrar recomendaciones
        let html = '';
        data.recommendations.forEach(item => {
            html += `
                <div class="col-6 col-md-3">
                    <div class="card categoria-card h-100">
                        <div class="card-img-container">
                            <img src="${item.imagen}" class="card-img-top" alt="${item.nombre}" onerror="this.src='https://via.placeholder.com/150x150?text=Imagen+no+disponible'">
                        </div>
                        <div class="card-body text-center">
                            <h6 class="card-title mb-1">${item.nombre}</h6>
                            <p class="card-text text-success fw-bold">${item.precio}</p>
                            <a href="Categorias/categorias.html?categoria=${item.categoria}" class="btn btn-sm btn-outline-success">Ver detalles</a>
                        </div>
                    </div>
                </div>
            `;
        });
        
        recomendacionesContainer.innerHTML = html;
        
    } catch (error) {
        console.error('Error al cargar recomendaciones:', error);
        
        if (recomendacionesContainer) {
            recomendacionesContainer.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Error al cargar las recomendaciones. Por favor, intenta de nuevo más tarde.
                    </div>
                </div>`;
        }
        
        // Ocultar el loading si aún está visible
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
    }
}