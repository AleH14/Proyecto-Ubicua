// Script para manejar la autenticación en el frontend

// URL base de la API
const API_URL = 'http://localhost:5000/api';

// Función para mostrar mensajes de error o éxito
function mostrarMensaje(mensaje, tipo = 'danger') {
    // Crear el elemento de alerta
    const alertaDiv = document.createElement('div');
    alertaDiv.className = `alert alert-${tipo} alert-dismissible fade show`;
    alertaDiv.setAttribute('role', 'alert');
    alertaDiv.innerHTML = `
        ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Insertar antes del formulario
    const formulario = document.querySelector('form');
    formulario.parentNode.insertBefore(alertaDiv, formulario);
    
    // Quitar después de 5 segundos
    setTimeout(() => {
        alertaDiv.classList.remove('show');
        setTimeout(() => alertaDiv.remove(), 300);
    }, 5000);
}

// Función para registrar un usuario
async function registrarUsuario(datosUsuario) {
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(datosUsuario)
        });

        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Error al registrar usuario');
        }

        // Guardar token en localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        return data;
    } catch (error) {
        console.error('Error de registro:', error);
        throw error;
    }
}

// Función para iniciar sesión
async function iniciarSesion(credenciales) {
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(credenciales)
        });

        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Credenciales inválidas');
        }

        // Guardar token en localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        return data;
    } catch (error) {
        console.error('Error de inicio de sesión:', error);
        throw error;
    }
}

// Función para cerrar sesión
function cerrarSesion() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// Función para verificar si hay sesión activa
function verificarSesion() {
    const token = localStorage.getItem('token');
    return !!token;
}

// Función para obtener datos del usuario actual
function obtenerUsuario() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

// Función para verificar si el usuario está autenticado y redirigir según sea necesario
function verificarAutenticacion(requiereAuth = true, redireccion = 'login.html') {
    const estaAutenticado = verificarSesion();
    
    // Si requiere autenticación pero no está autenticado, redirigir al login
    if (requiereAuth && !estaAutenticado) {
        window.location.href = redireccion;
    }
    
    // Si no requiere autenticación pero está autenticado, redirigir a la interfaz
    if (!requiereAuth && estaAutenticado) {
        window.location.href = 'interfaz.html';
    }
}

// Función para obtener el perfil completo del usuario desde el servidor
async function obtenerPerfil() {
    try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No hay sesión activa');

        const response = await fetch(`${API_URL}/auth/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Error al obtener perfil');
        }

        return data.user;
    } catch (error) {
        console.error('Error al obtener perfil:', error);
        // Si hay error de autenticación, cerrar sesión
        if (error.message.includes('No hay sesión activa') || error.message.includes('No autorizado')) {
            cerrarSesion();
        }
        throw error;
    }
}