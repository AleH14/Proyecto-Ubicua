document.addEventListener('DOMContentLoaded', function() {
    // Verificar si hay un usuario autenticado
    const token = localStorage.getItem('token');
    if (!token) {
        console.log('Usuario no autenticado, no se cargarán recomendaciones especiales');
        return;
    }

    const specialSection = document.getElementById('special-recommendations-container');
    if (!specialSection) {
        console.error('No se encontró el contenedor de recomendaciones especiales');
        return;
    }

    // Mostrar cargando
    specialSection.innerHTML = `
        <div class="col-12 text-center py-4">
            <div class="spinner-border text-success" role="status">
                <span class="visually-hidden">Cargando recomendaciones especiales...</span>
            </div>
            <p class="mt-2 text-muted">Analizando tus preferencias para sugerirte recetas...</p>
        </div>
    `;

    // Actualizar título de la sección
    const sectionTitle = document.getElementById('special-section-title');
    if (sectionTitle) {
        sectionTitle.textContent = "Recetas recomendadas para ti";
    }

    // Obtener la hora actual
    const hours = new Date().getHours();
    let timeGreeting = '';
    
    if (hours >= 5 && hours < 12) {
        timeGreeting = 'buenos días';
    } else if (hours >= 12 && hours < 19) {
        timeGreeting = 'buenas tardes';
    } else {
        timeGreeting = 'buenas noches';
    }

    // Imágenes predeterminadas por categoría (si la API no proporciona URLs)
    const defaultImages = {
        desayuno: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=600",
        almuerzo: "https://images.unsplash.com/photo-1547592180-85f173990554?w=600",
        merienda: "https://images.unsplash.com/photo-1541599188778-cdc73298e8fd?w=600",
        cena: "https://images.unsplash.com/photo-1574484284002-952d92456975?w=600",
        postre: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=600",
        saludable: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600",
        default: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600"
    };

    // Obtener recomendaciones especiales del servidor
    fetch('http://localhost:5000/api/special-recommendations', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error al obtener recomendaciones');
        }
        return response.json();
    })
    .then(data => {
        if (data.success && data.data) {
            // Actualizar título con nombre del usuario
            const user = JSON.parse(localStorage.getItem('user')) || {};
            const welcomeTitle = document.getElementById('special-section-title');
            if (welcomeTitle && user.nombre) {
                welcomeTitle.textContent = `Recetas para ti, ${user.nombre}`;
            }
            
            // Mostrar mensaje personalizado
            const messageElement = document.getElementById('special-message');
            if (messageElement && data.data.mensaje) {
                messageElement.textContent = `¡${timeGreeting.charAt(0).toUpperCase() + timeGreeting.slice(1)}! ${data.data.mensaje}`;
                messageElement.style.display = 'block';
            }
            
            // Construir las tarjetas de recetas
            let cardsHTML = '';
            
            data.data.recomendaciones.forEach((receta, index) => {
                // Generar una ID única para los colapsables
                const recetaId = `receta-${index}`;
                const ingredientesId = `ingredientes-${index}`;
                const pasosId = `pasos-${index}`;
                
                // Determinar la URL de la imagen
                let imagenUrl = receta.imagen_url || 
                                receta.image_url || 
                                defaultImages[receta.categoria?.toLowerCase()] || 
                                defaultImages.default;
                
                cardsHTML += `
                <div class="col-md-4 mb-4">
                    <div class="card h-100 shadow-sm border-0 rounded-4">
                        <div class="badge bg-success position-absolute top-0 end-0 m-3">
                            <i class="fas fa-utensils me-1"></i> Receta
                        </div>
                        <img src="${imagenUrl}" 
                            class="card-img-top rounded-top-4" alt="${receta.nombre}"
                            onerror="this.src='${defaultImages.default}'" style="height: 200px; object-fit: cover;">
                        <div class="card-body">
                            <h5 class="card-title fw-bold">${receta.nombre}</h5>
                            <p class="card-text text-muted small mb-2">${receta.descripcion}</p>
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <span class="badge bg-light text-dark">
                                    <i class="far fa-clock me-1"></i> ${receta.tiempo_preparacion}
                                </span>
                                <span class="badge bg-light text-dark">
                                    <i class="fas fa-signal me-1"></i> ${receta.dificultad}
                                </span>
                            </div>
                            
                            <div class="accordion accordion-flush" id="${recetaId}">
                                <!-- Ingredientes -->
                                <div class="accordion-item border-0">
                                    <h2 class="accordion-header">
                                        <button class="accordion-button collapsed p-2 bg-light rounded" type="button" 
                                                data-bs-toggle="collapse" data-bs-target="#${ingredientesId}">
                                            <i class="fas fa-shopping-basket me-2 text-success"></i> Ingredientes
                                        </button>
                                    </h2>
                                    <div id="${ingredientesId}" class="accordion-collapse collapse" data-bs-parent="#${recetaId}">
                                        <div class="accordion-body px-2 py-3">
                                            <ul class="list-unstyled mb-0">
                                                ${receta.ingredientes.map(ingrediente => 
                                                    `<li class="mb-1 small"><i class="fas fa-check text-success me-2"></i>${ingrediente}</li>`
                                                ).join('')}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Pasos -->
                                <div class="accordion-item border-0">
                                    <h2 class="accordion-header">
                                        <button class="accordion-button collapsed p-2 bg-light rounded" type="button" 
                                                data-bs-toggle="collapse" data-bs-target="#${pasosId}">
                                            <i class="fas fa-list-ol me-2 text-success"></i> Preparación
                                        </button>
                                    </h2>
                                    <div id="${pasosId}" class="accordion-collapse collapse" data-bs-parent="#${recetaId}">
                                        <div class="accordion-body px-2 py-3">
                                            <ol class="mb-0 ps-3">
                                                ${receta.pasos.map(paso => 
                                                    `<li class="mb-2 small">${paso}</li>`
                                                ).join('')}
                                            </ol>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="d-grid mt-3">
                                <button class="btn btn-sm btn-outline-success" type="button" 
                                        data-bs-toggle="collapse" data-bs-target="#${ingredientesId}">
                                    Ver receta completa
                                </button>
                            </div>
                        </div>
                    </div>
                </div>`;
            });
            
            // Mostrar las recetas
            specialSection.innerHTML = cardsHTML;
            
        } else {
            throw new Error(data.message || 'No se pudieron cargar las recomendaciones');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        specialSection.innerHTML = `
            <div class="col-12 text-center py-4">
                <div class="alert alert-light border">
                    <i class="fas fa-utensils text-muted mb-3 fs-3"></i>
                    <p class="mb-0">Aún no tenemos suficiente información sobre tus preferencias culinarias.</p>
                    <p class="small text-muted">Sigue usando la app para recibir recetas personalizadas.</p>
                </div>
            </div>
        `;
    });
});

// Añadir esta función para verificar imágenes antes de mostrarlas
function verificarImagen(url, recetaId) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = function() {
            resolve(url); // La imagen cargó correctamente
        };
        img.onerror = function() {
            // Si la imagen falla, usar la imagen de respaldo según categoría
            const receta = document.querySelector(`#receta-${recetaId}`);
            const categoria = receta.dataset.categoria || 'default';
            resolve(defaultImages[categoria] || defaultImages.default);
        };
        img.src = url;
    });
}

// Luego usar esta función al cargar las recetas
async function cargarRecetas(recetas) {
    let cardsHTML = '';
    
    for (let i = 0; i < recetas.length; i++) {
        const receta = recetas[i];
        
        // Verificar la imagen antes de usarla
        const imagenVerificada = await verificarImagen(
            receta.imagen_url || defaultImages[receta.categoria?.toLowerCase()] || defaultImages.default,
            i
        );
        
        // Usar la imagen verificada en la tarjeta
        cardsHTML += `
        <div class="col-md-4 mb-4">
            <div class="card h-100 shadow-sm border-0 rounded-4" id="receta-${i}" data-categoria="${receta.categoria || 'default'}">
                <!-- Resto del código con imagenVerificada -->
                <img src="${imagenVerificada}" class="card-img-top rounded-top-4" alt="${receta.nombre}"
                     style="height: 200px; object-fit: cover;">
                <!-- ... -->
            </div>
        </div>`;
    }
    
    specialSection.innerHTML = cardsHTML;
}