let compraEnProceso = false;

document.addEventListener('DOMContentLoaded', function() {
    // Obtener la categoría de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const categoria = urlParams.get('categoria');
    
    if (!categoria) {
        mostrarError('No se especificó ninguna categoría');
        return;
    }
    
    // Cargar los datos de productos desde el JSON
    fetch('./data/productos.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('No se pudo cargar el archivo JSON');
            }
            return response.json();
        })
        .then(data => {
            // Verificar si existe la categoría
            if (!data[categoria]) {
                mostrarError('La categoría solicitada no existe');
                return;
            }
            
            // Actualizar el título de la página
            document.title = `${data[categoria].nombre} | FoodDelivery`;
            
            // Actualizar el título de la sección
            const tituloCategoria = document.getElementById('categoria-titulo');
            tituloCategoria.textContent = data[categoria].nombre;
            
            // Cargar los productos
            cargarProductos(data[categoria].productos);
        })
        .catch(error => {
            console.error('Error:', error);
            mostrarError('Error al cargar los productos');
        });
    
    // Añadir evento al botón de compra
    document.getElementById('btn-comprar').addEventListener('click', procesarCompra);
    
    // Resto del código dentro de DOMContentLoaded...
});

// Función para cargar los productos en la página
function cargarProductos(productos) {
    const contenedor = document.getElementById('productos-container');
    
    // Limpiar el contenedor
    contenedor.innerHTML = '';
    
    if (productos.length === 0) {
        contenedor.innerHTML = `
            <div class="col-12 text-center py-5">
                <p>No hay productos disponibles en esta categoría.</p>
            </div>
        `;
        return;
    }
    
    // Agregar cada producto al contenedor (versión simplificada)
    productos.forEach(producto => {
        const productoHTML = `
            <div class="col-md-4 mb-4">
                <div class="card h-100 shadow-sm product-card">
                    <img src="${producto.imagen}" class="card-img-top" alt="${producto.nombre}" 
                         style="height: 200px; object-fit: cover; cursor: pointer;"
                         data-bs-toggle="modal" data-bs-target="#productoDetailModal" 
                         onclick="cargarDetalleProducto('${producto.id}', '${producto.nombre}', 
                         '${producto.descripcion}', '${producto.imagen}', '${producto.precio}', 
                         '${producto.rating}', '${producto.ruta || ''}')">
                    <div class="card-body text-center">
                        <h5 class="card-title">${producto.nombre}</h5>
                        <p class="fw-bold">${producto.precio}</p>
                        <small class="text-muted">Click para ver detalles</small>
                    </div>
                </div>
            </div>
        `;
        
        contenedor.innerHTML += productoHTML;
    });
}

// Función para mostrar alertas temporalesñ
function mostrarAlertaTemporal(mensaje, tipo = 'danger') {
    // Crear contenedor para el mensaje si no existe
    let alertaContainer = document.getElementById('alerta-temporal');
    if (!alertaContainer) {
        alertaContainer = document.createElement('div');
        alertaContainer.id = 'alerta-temporal';
        alertaContainer.style.position = 'fixed';
        alertaContainer.style.top = '20px';
        alertaContainer.style.right = '20px';
        alertaContainer.style.zIndex = '9999';
        document.body.appendChild(alertaContainer);
    }
    
    // Crear la alerta
    const alerta = document.createElement('div');
    alerta.className = `alert alert-${tipo} alert-dismissible fade show`;
    alerta.innerHTML = `
        ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Añadir alerta al contenedor
    alertaContainer.appendChild(alerta);
    
    // Eliminar automáticamente después de 5 segundos
    setTimeout(() => {
        alerta.classList.remove('show');
        setTimeout(() => alerta.remove(), 300);
    }, 5000);
}

// Simplifica la función ejecutarModelo para que solo envíe la solicitud sin mostrar resultados
async function ejecutarModelo(modelo) {
    try {
        console.log('Enviando solicitud para cargar modelo:', modelo);
        
        // Solo envía la solicitud al servidor con la ruta del modelo
        const respuesta = await fetch('http://127.0.0.1:5000/run-script', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ modelo }) // Enviar el modelo al servidor
        });
        
        // Verificar si la respuesta es exitosa
        if (!respuesta.ok) {
            const errorData = await respuesta.json().catch(() => ({}));
            throw new Error(errorData.message || `Error del servidor: ${respuesta.status}`);
        }
        
        // No mostramos ningún resultado en la interfaz
    } catch (error) {
        // Registramos el error en la consola para depuración
        console.error('Error en la solicitud:', error);
        
        // Mostrar mensaje de error en la interfaz
        mostrarAlertaTemporal(`Error al cargar el modelo 3D: ${error.message || 'No se pudo conectar con el servidor'}`);
    }
}

// Función para cargar los detalles de un producto en el modal
function cargarDetalleProducto(id, nombre, descripcion, imagen, precio, rating, ruta) {
    document.getElementById('producto-name').textContent = nombre;
    document.getElementById('producto-description').textContent = descripcion;
    document.getElementById('producto-img').src = imagen;
    document.getElementById('producto-price').textContent = precio;
    document.getElementById('producto-rating').textContent = rating;
    
    // Guardar el ID del producto como atributo de datos
    const btnComprar = document.getElementById('btn-comprar');
    btnComprar.dataset.id = id;
    btnComprar.dataset.nombre = nombre;
    btnComprar.dataset.precio = precio;
    btnComprar.dataset.imagen = imagen;
    
    // Obtener la categoría actual
    const urlParams = new URLSearchParams(window.location.search);
    const categoria = urlParams.get('categoria');
    btnComprar.dataset.categoria = categoria;
    
    // Gestionar el botón de modelo 3D
    const btnModelo3D = document.getElementById('btn-modelo-3d');
    if (ruta && ruta !== 'undefined' && ruta !== '') {
        btnModelo3D.style.display = 'block';
        btnModelo3D.onclick = function() { ejecutarModelo(ruta); };
    } else {
        btnModelo3D.style.display = 'none';
    }
}

// Añadir esta función para verificar autenticación
function verificarAutenticacionCompra() {
    const token = localStorage.getItem('token');
    if (!token) {
        return false;
    }
    return true;
}

// Añadir esta función para procesar la compra
async function procesarCompra(event) {
    // Añade este código al principio de procesarCompra
    const token = localStorage.getItem('token');
    console.log('Token:', token ? token.substring(0, 20) + '...' : 'No token'); // Mostrar solo el inicio para seguridad
    
    // Evitar doble clic
    if (compraEnProceso) return;
    
    // Obtener los datos del botón
    const btn = event.target;
    const productId = btn.dataset.id;
    const productName = btn.dataset.nombre;
    const price = btn.dataset.precio;
    const productImage = btn.dataset.imagen;
    const categoria = btn.dataset.categoria;
    
    // Verificar si el usuario está autenticado
    if (!verificarAutenticacionCompra()) {
        // Mostrar mensaje para iniciar sesión
        mostrarAlertaTemporal('Debes iniciar sesión para realizar compras', 'warning');
        // Redirigir a la página de login después de un breve retraso
        setTimeout(() => {
            window.location.href = '../login.html?redirect=' + encodeURIComponent(window.location.href);
        }, 2000);
        return;
    }
    
    try {
        compraEnProceso = true;
        
        // Cambiar el texto del botón
        const textoOriginal = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Procesando...';
        
        // Obtener token de autenticación
        const token = localStorage.getItem('token');
        
        // Enviar la solicitud al servidor
        const response = await fetch('http://localhost:5000/api/orders/create', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                productId,
                productName,
                price,
                productImage,
                categoria,
                quantity: 1
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Mostrar mensaje de éxito
            mostrarAlertaTemporal('¡Compra realizada con éxito!', 'success');
            
            // Cerrar el modal después de un breve retraso
            setTimeout(() => {
                const modal = bootstrap.Modal.getInstance(document.getElementById('productoDetailModal'));
                modal.hide();
            }, 1500);
        } else {
            throw new Error(data.error || 'Error al procesar la compra');
        }
    } catch (error) {
        console.error('Error en la compra:', error);
        mostrarAlertaTemporal(`Error: ${error.message}`, 'danger');
    } finally {
        // Restablecer el estado del botón
        btn.disabled = false;
        btn.innerHTML = 'Comprar';
        compraEnProceso = false;
    }
}

// Función para mostrar mensajes de error
function mostrarError(mensaje) {
    const contenedor = document.getElementById('productos-container');
    contenedor.innerHTML = `
        <div class="col-12">
            <div class="alert alert-danger" role="alert">
                <i class="fas fa-exclamation-triangle me-2"></i> ${mensaje}
            </div>
        </div>
    `;
    console.error(mensaje);
}

// En la función de iniciarSesion en auth.js (después de recibir la respuesta)


async function testAuth() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch('http://localhost:5000/api/auth/test', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        console.log('Test de autenticación:', data);
    } catch (error) {
        console.error('Error en test:', error);
    }
}
testAuth();
