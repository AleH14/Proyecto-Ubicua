document.addEventListener('DOMContentLoaded', function() {
    cargarCategorias();
});

// Función para cargar las categorías desde el JSON
async function cargarCategorias() {
    try {
        const response = await fetch('./JSONcategorias/categoriasInterfaz.json');
        if (!response.ok) {
            throw new Error('No se pudieron cargar las categorías');
        }
        
        const data = await response.json();
        mostrarCategorias(data.categorias);
    } catch (error) {
        console.error('Error al cargar las categorías:', error);
        mostrarErrorCategorias('No se pudieron cargar las categorías');
    }
}

// Función para mostrar las categorías en la interfaz
function mostrarCategorias(categorias) {
    const contenedor = document.getElementById('categorias-container');
    const loadingElement = document.getElementById('categorias-loading');
    
    // Eliminar el spinner de carga
    if (loadingElement) {
        loadingElement.remove();
    }
    
    // Crear el HTML para cada categoría
    categorias.forEach(categoria => {
        const categoriaHTML = `
            <div class="col-6 col-md-4 col-lg-2">
                <a href="${categoria.url}" class="text-decoration-none">
                    <div class="category-card shadow-sm">
                        <img src="${categoria.imagen}" class="img-fluid w-100" alt="${categoria.nombre}">
                        <div class="p-2 text-center">
                            <h6 class="m-0">${categoria.nombre}</h6>
                        </div>
                    </div>
                </a>
            </div>
        `;
        
        contenedor.innerHTML += categoriaHTML;
    });
}

// Función para mostrar mensajes de error
function mostrarErrorCategorias(mensaje) {
    const contenedor = document.getElementById('categorias-container');
    const loadingElement = document.getElementById('categorias-loading');
    
    // Eliminar el spinner de carga
    if (loadingElement) {
        loadingElement.remove();
    }
    
    // Mostrar mensaje de error
    contenedor.innerHTML = `
        <div class="col-12">
            <div class="alert alert-danger" role="alert">
                <i class="fas fa-exclamation-triangle me-2"></i> ${mensaje}
            </div>
        </div>
    `;
}