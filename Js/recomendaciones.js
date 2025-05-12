document.addEventListener('DOMContentLoaded', function() {
    // Verificar si el usuario está autenticado
    const user = obtenerUsuario();
    const recomendacionesSection = document.getElementById('recomendaciones-section');
    
    if (user && recomendacionesSection) {
        // Mostrar la sección de recomendaciones
        recomendacionesSection.style.display = 'block';
        
        // Cargar las recomendaciones personalizadas
        cargarRecomendaciones();
    }
});

async function cargarRecomendaciones() {
    const token = localStorage.getItem('token');
    const recomendacionesContainer = document.getElementById('recomendaciones-container');
    const loadingElement = document.getElementById('recomendaciones-loading');
    
    if (!token) {
        recomendacionesContainer.innerHTML = `
            <div class="col-12">
                <div class="alert alert-info">
                    Inicia sesión para ver recomendaciones personalizadas
                </div>
            </div>`;
        return;
    }
    
    try {
        // Simulación de datos de ejemplo (reemplazar con llamada real a la API)
        // En una implementación real, esto sería una llamada a tu backend
        const recomendaciones = [
            {
                id: 'rec-1',
                nombre: 'Pizza Margarita',
                imagen: 'https://images.unsplash.com/photo-1513104890138-7c749659a591',
                precio: '€12.95',
                categoria: 'pizza'
            },
            {
                id: 'rec-2',
                nombre: 'Hamburguesa Especial',
                imagen: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd',
                precio: '€8.50',
                categoria: 'hamburguesas'
            },
            {
                id: 'rec-3',
                nombre: 'Ensalada César',
                imagen: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd',
                precio: '€7.95',
                categoria: 'saludable'
            },
            {
                id: 'rec-4',
                nombre: 'Sushi Variado',
                imagen: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c',
                precio: '€16.50',
                categoria: 'asiatica'
            }
        ];
        
        // Ocultar el loading
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
        
        // Mostrar recomendaciones
        let html = '';
        recomendaciones.forEach(item => {
            html += `
                <div class="col-6 col-md-3">
                    <div class="card categoria-card h-100">
                        <div class="card-img-container">
                            <img src="${item.imagen}" class="card-img-top" alt="${item.nombre}">
                        </div>
                        <div class="card-body text-center">
                            <h6 class="card-title mb-1">${item.nombre}</h6>
                            <p class="card-text text-success fw-bold">${item.precio}</p>
                            <a href="#" class="btn btn-sm btn-outline-success">Ver detalles</a>
                        </div>
                    </div>
                </div>
            `;
        });
        
        recomendacionesContainer.innerHTML = html;
        
    } catch (error) {
        console.error('Error al cargar recomendaciones:', error);
        recomendacionesContainer.innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger">
                    Error al cargar las recomendaciones
                </div>
            </div>`;
    }
}