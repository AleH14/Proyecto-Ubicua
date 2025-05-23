document.addEventListener('DOMContentLoaded', function() {
        const token = localStorage.getItem('token');
    
    if (!token) return;
    
    // Mostrar la sección de recomendaciones
    const recomendacionesSection = document.getElementById('recomendaciones-section');
    if (recomendacionesSection) {
        recomendacionesSection.style.display = 'block';
    }
    
    // Obtener recomendaciones desde el servidor
    fetch('http://localhost:5000/api/recommendations', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        const recomendacionesContainer = document.getElementById('recomendaciones-container');
        const loadingElement = document.getElementById('recomendaciones-loading');
        
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
        
        // Si hay recomendaciones, mostrarlas
        if (data.success && data.recommendations && data.recommendations.length > 0) {
            data.recommendations.forEach(item => {
                const col = document.createElement('div');
                col.className = 'col-md-4 col-lg-3 col-sm-6';
                
                col.innerHTML = `
                    <div class="card h-100 shadow-sm hover-card">
                        <div class="ratio ratio-4x3 rounded-top overflow-hidden">
                            <img src="${item.imagen}" class="card-img-top" alt="${item.nombre}">
                        </div>
                        <div class="card-body p-3">
                            <h6 class="card-title mb-1">${item.nombre}</h6>
                            <p class="text-muted small mb-1">${item.categoria}</p>
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="fw-bold text-success">${item.precio}</span>
                                <button class="btn btn-sm btn-outline-success" onclick="verDetalles('${item.categoria}')">
                                    <i class="fas fa-arrow-right"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                
                recomendacionesContainer.appendChild(col);
            });
        } else if (!data.hasOrders) {
            // Si no hay pedidos previos, mostrar mensaje alternativo
            recomendacionesContainer.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-light text-center">
                        <i class="fas fa-utensils mb-3 fa-2x text-muted"></i>
                        <p>Haz tu primer pedido para recibir recomendaciones personalizadas.</p>
                        <a href="#restaurantes" class="btn btn-sm btn-success">Explorar restaurantes</a>
                    </div>
                </div>
            `;
        } else {
            // Si hay error o no hay recomendaciones
            recomendacionesContainer.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-light text-center">
                        <p>No hay recomendaciones disponibles en este momento.</p>
                    </div>
                </div>
            `;
        }
    })
    .catch(error => {
        console.error('Error al obtener recomendaciones:', error);
        const recomendacionesContainer = document.getElementById('recomendaciones-container');
        const loadingElement = document.getElementById('recomendaciones-loading');
        
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
        
        if (recomendacionesContainer) {
            recomendacionesContainer.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-light text-center">
                        <i class="fas fa-exclamation-circle mb-3 fa-2x text-muted"></i>
                        <p>Ocurrió un error al cargar las recomendaciones.</p>
                    </div>
                </div>
            `;
        }
    });
    
    // Función para ver detalles de categoría
    window.verDetalles = function(categoria) {
        window.location.href = `Categorias/categorias.html?categoria=${categoria}`;
    }
});