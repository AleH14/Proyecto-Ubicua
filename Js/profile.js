document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticación
    const user = obtenerUsuario();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // Configurar menú de navegación
    setupNavMenu(user);
    
    // Cargar información del perfil
    loadProfileInfo(user);
    
    // Configurar botón de limpiar historial
    document.getElementById('clearHistoryBtn').addEventListener('click', clearHistory);
    
    // Configurar botón de cerrar sesión
    document.getElementById('logoutBtnSide').addEventListener('click', function(e) {
        e.preventDefault();
        cerrarSesion();
    });

    // Configurar botón de análisis de preferencias al cargar la página
    document.getElementById('analyzePreferencesBtn').addEventListener('click', analyzePreferences);

    // Configurar botón de borrar preferencias
    document.getElementById('clearPreferencesBtn').addEventListener('click', clearPreferences);
});

// Configurar el menú de navegación
function setupNavMenu(user) {
    const navMenu = document.getElementById('nav-menu');
    
    navMenu.innerHTML = `
        <li class="nav-item">
            <a class="nav-link" href="interfaz.html"><i class="fas fa-home me-1"></i> Inicio</a>
        </li>
        <li class="nav-item">
            <a class="nav-link" href="#"><i class="fas fa-store me-1"></i> Restaurantes</a>
        </li>
        <li class="nav-item">
            <a class="nav-link" href="#"><i class="fas fa-th-large me-1"></i> Categorías</a>
        </li>
        <li class="nav-item dropdown">
            <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                <i class="fas fa-user-circle me-1"></i> ${user.nombre}
            </a>
            <ul class="dropdown-menu dropdown-menu-end">
                <li><a class="dropdown-item small" href="profile.html"><i class="fas fa-user me-2"></i>Mi perfil</a></li>
                <li><a class="dropdown-item small" href="mis-compras.html"><i class="fas fa-shopping-bag me-2"></i>Mis compras</a></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item small" href="#" id="logoutBtn"><i class="fas fa-sign-out-alt me-2"></i>Cerrar sesión</a></li>
            </ul>
        </li>
    `;
    
    // Configurar botón de cerrar sesión
    document.getElementById('logoutBtn').addEventListener('click', function(e) {
        e.preventDefault();
        cerrarSesion();
    });
}

// Cargar información del perfil
async function loadProfileInfo(user) {
    const profileInfo = document.getElementById('profile-info');
    
    try {
        // Obtener información actualizada del perfil
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/api/auth/profile', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('No se pudo cargar la información del perfil');
        }
        
        const data = await response.json();
        const profileUser = data.user;
        
        // Mostrar información del perfil
        profileInfo.innerHTML = `
            <div class="row mb-4">
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label small text-muted">Nombre</label>
                        <div class="form-control">${profileUser.nombre}</div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label small text-muted">Apellidos</label>
                        <div class="form-control">${profileUser.apellidos}</div>
                    </div>
                </div>
            </div>
            <div class="row mb-4">
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label small text-muted">Correo electrónico</label>
                        <div class="form-control">${profileUser.email}</div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label small text-muted">Teléfono</label>
                        <div class="form-control">${profileUser.telefono || 'No especificado'}</div>
                    </div>
                </div>
            </div>
            <button class="btn btn-outline-success">
                <i class="fas fa-edit me-2"></i> Editar información
            </button>
        `;
    } catch (error) {
        console.error('Error:', error);
        profileInfo.innerHTML = `
            <div class="alert alert-danger">
                Error al cargar la información. Por favor, intente de nuevo más tarde.
            </div>
        `;
    }
}

// Función para limpiar historial de conversaciones
async function clearHistory() {
    if (!confirm('¿Estás seguro de que deseas eliminar todo el historial de conversaciones con el asistente?')) {
        return;
    }
    
    try {
        // Obtener token de autenticación
        const token = localStorage.getItem('token');
        
        if (!token) {
            alert("Por favor, inicia sesión para usar esta funcionalidad");
            return;
        }
        
        const response = await fetch('http://localhost:5000/api/conversations/clear', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Historial de conversaciones eliminado correctamente');
        } else {
            alert('Error al eliminar el historial: ' + data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Ha ocurrido un error al intentar limpiar el historial');
    }
}

// Función para analizar preferencias del usuario
async function analyzePreferences() {
    const preferencesResults = document.getElementById('preferencesResults');
    const preferencesContent = document.getElementById('preferencesContent');
    
    // Mostrar sección de resultados con spinner
    preferencesResults.style.display = 'block';
    preferencesContent.innerHTML = `
        <div class="text-center">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Analizando...</span>
            </div>
            <p class="mt-2">Analizando tus conversaciones y pedidos...</p>
        </div>
    `;
    
    try {
        // Obtener token de autenticación
        const token = localStorage.getItem('token');
        
        if (!token) {
            preferencesContent.innerHTML = `
                <div class="alert alert-warning">
                    Por favor, inicia sesión para usar esta funcionalidad.
                </div>`;
            return;
        }
        
        const response = await fetch('http://localhost:5000/api/conversations/analyze-preferences', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Formatear y mostrar las preferencias detectadas
            const formattedPreferences = formatPreferences(data.preferences);
            preferencesContent.innerHTML = `
                <div class="preferences-list">
                    ${formattedPreferences}
                </div>
                <p class="text-muted mt-3 small">
                    Estas preferencias se han guardado y se utilizarán para personalizar tus recomendaciones.
                </p>
            `;
        } else {
            preferencesContent.innerHTML = `
                <div class="alert alert-warning">
                    ${data.message || 'No se pudieron analizar tus preferencias. Intenta tener más conversaciones con el asistente.'}
                </div>
            `;
        }
    } catch (error) {
        console.error('Error:', error);
        preferencesContent.innerHTML = `
            <div class="alert alert-danger">
                Ha ocurrido un error al analizar tus preferencias. Por favor, intenta de nuevo más tarde.
            </div>
        `;
    }
}

// Función para formatear el texto de preferencias a HTML
function formatPreferences(preferencesText) {
    // Si ya viene formateado con HTML, lo devolvemos como está
    if (preferencesText.includes('<ul>') || preferencesText.includes('<li>')) {
        return preferencesText;
    }
    
    // Dividir por líneas y formatear
    const lines = preferencesText.split('\n')
        .filter(line => line.trim() !== '')
        .map(line => {
            line = line.trim();
            // Si la línea comienza con - o * la convertimos en elemento de lista
            if (line.startsWith('-') || line.startsWith('*')) {
                return `<li>${line.substring(1).trim()}</li>`;
            }
            // Si es un título o categoría (sin - o *)
            return `<p class="fw-bold mb-1">${line}</p>`;
        });
    
    if (lines.some(line => line.startsWith('<li>'))) {
        return `<ul class="mb-3">${lines.join('')}</ul>`;
    } else {
        return lines.join('');
    }
}

// Función para borrar análisis de preferencias
async function clearPreferences() {
    if (!confirm('¿Estás seguro de que deseas eliminar tu análisis de preferencias alimenticias?')) {
        return;
    }
    
    try {
        // Obtener token de autenticación
        const token = localStorage.getItem('token');
        
        if (!token) {
            alert("Por favor, inicia sesión para usar esta funcionalidad");
            return;
        }
        
        const response = await fetch('http://localhost:5000/api/user/clear-preferences', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Preferencias eliminadas correctamente');
            
            // Ocultar resultados si están visibles
            const preferencesResults = document.getElementById('preferencesResults');
            if (preferencesResults) {
                preferencesResults.style.display = 'none';
            }
        } else {
            alert('Error al eliminar las preferencias: ' + data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Ha ocurrido un error al intentar borrar las preferencias');
    }
}