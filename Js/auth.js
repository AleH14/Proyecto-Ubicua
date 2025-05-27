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

// Modificación de las variables globales para trabajar con Blob
let mediaStream = null;
let capturedImageBlob = null; // Ahora almacenamos un Blob en lugar de base64
let faceToken = null;
let faceCount = 0;

// Función para iniciar la cámara
async function iniciarCamara() {
    try {
        // Asegurar que la cámara anterior está completamente detenida
        if (mediaStream) {
            detenerCamara();
        }
        
        console.log('Solicitando acceso a la cámara...');
        
        // Solicitar acceso a la cámara
        mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: "user" // Cámara frontal
            },
            audio: false
        });
        
        console.log('Acceso a cámara concedido, configurando video...');
        
        // Mostrar la transmisión de video
        const videoElement = document.getElementById('cameraFeed');
        videoElement.srcObject = mediaStream;
        videoElement.classList.remove('d-none');
        
        // Asegurarse de que el video comience a reproducirse
        videoElement.play().catch(err => {
            console.error('Error al reproducir video:', err);
        });
        
        // Ocultar placeholder y mostrar botones relevantes
        document.getElementById('cameraPlaceholder').classList.add('d-none');
        document.getElementById('startCameraBtn').classList.add('d-none');
        document.getElementById('captureFaceBtn').classList.remove('d-none');
        document.getElementById('cancelCaptureBtn').classList.remove('d-none');
        
        // Ocultar preview si está visible
        document.getElementById('faceCapturePreview').classList.add('d-none');
        
        // Actualizar estado
        document.getElementById('faceIdStatus').textContent = 'Coloca tu rostro en el centro y mira directamente a la cámara';
    } catch (error) {
        console.error('Error al acceder a la cámara:', error);
        mostrarMensaje('No se pudo acceder a la cámara. Verifica los permisos.', 'danger');
    }
}

// Función para detener la cámara
function detenerCamara() {
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
        
        // Ocultar video y restablecer vista
        document.getElementById('cameraFeed').classList.add('d-none');
        document.getElementById('cameraFeed').srcObject = null;
        document.getElementById('cameraPlaceholder').classList.remove('d-none');
        
        // Restablecer botones
        document.getElementById('startCameraBtn').classList.remove('d-none');
        document.getElementById('captureFaceBtn').classList.add('d-none');
        document.getElementById('confirmFaceBtn').classList.add('d-none');
        document.getElementById('cancelCaptureBtn').classList.add('d-none');
    }
}

// Función modificada para verificar rostros usando Blob
async function verificarRostros(imageBlob) {
    try {
        const formData = new FormData();
        formData.append('image', imageBlob, 'face.jpg');
        
        const response = await fetch(`${API_URL}/face/count-blob`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        console.log('Respuesta de verificación de rostros:', data);
        
        if (!data.success) {
            throw new Error(data.error || 'Error al verificar rostros');
        }
        
        return {
            count: data.faceCount,
            message: data.message
        };
    } catch (error) {
        console.error('Error al verificar rostros:', error);
        throw error;
    }
}

// Función para capturar foto
async function capturarFoto() {
    if (!mediaStream) return;
    
    const videoElement = document.getElementById('cameraFeed');
    const canvas = document.getElementById('photoCanvas');
    const context = canvas.getContext('2d');
    
    // Establecer dimensiones del canvas
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    
    // Dibujar el frame actual del video en el canvas
    context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    
    // Convertir canvas a Blob de alta calidad
    canvas.toBlob(async (blob) => {
        // Guardar el Blob de la imagen
        capturedImageBlob = blob;
        
        try {
            // Mostrar spinner de carga durante la verificación
            document.getElementById('faceIdStatus').textContent = 'Analizando imagen...';
            document.getElementById('captureFaceBtn').disabled = true;
            document.getElementById('cancelCaptureBtn').disabled = true;
            
            // Verificar la cantidad de rostros antes de continuar
            const result = await verificarRostros(blob);
            faceCount = result.count;
            
            // Habilitar botones de nuevo
            document.getElementById('captureFaceBtn').disabled = false;
            document.getElementById('cancelCaptureBtn').disabled = false;
            
            // Si hay más de un rostro, mostrar mensaje y permitir volver a intentar
            if (faceCount > 1) {
                mostrarMensaje('Por favor, asegúrate de estar solo en la cámara. Se ha detectado más de una cara.', 'warning');
                document.getElementById('faceIdStatus').textContent = 'Se detectaron múltiples rostros. Por favor, intente nuevamente estando solo frente a la cámara.';
                return;
            }
            
            // Si no se detectó ningún rostro
            if (faceCount === 0) {
                mostrarMensaje('No se detectó ningún rostro. Asegúrate de que tu cara es visible y está bien iluminada.', 'warning');
                document.getElementById('faceIdStatus').textContent = 'No se detectó ningún rostro. Por favor, intente nuevamente.';
                return;
            }
            
            // Mostrar la imagen capturada como vista previa (crear URL temporal del Blob)
            const previewElement = document.getElementById('faceCapturePreview');
            const imageUrl = URL.createObjectURL(blob);
            previewElement.style.backgroundImage = `url(${imageUrl})`;
            previewElement.style.backgroundSize = 'cover';
            previewElement.style.backgroundPosition = 'center';
            previewElement.classList.remove('d-none');
            
            // Almacenar la URL para liberarla después
            previewElement.dataset.blobUrl = imageUrl;
            
            // Ocultar video y mostrar botones de confirmación
            videoElement.classList.add('d-none');
            document.getElementById('captureFaceBtn').classList.add('d-none');
            document.getElementById('confirmFaceBtn').classList.remove('d-none');
            
            // Actualizar estado
            document.getElementById('faceIdStatus').textContent = '¿Es clara la imagen de tu rostro?';
            
        } catch (error) {
            mostrarMensaje(`Error al analizar la imagen: ${error.message}`, 'danger');
            document.getElementById('captureFaceBtn').disabled = false;
            document.getElementById('cancelCaptureBtn').disabled = false;
            document.getElementById('faceIdStatus').textContent = 'Error al analizar la imagen. Intente nuevamente.';
        }
    }, 'image/jpeg', 0.95); // Usar calidad 0.95 para JPEG (alta calidad)
}

// Función para procesar la imagen capturada y obtener el token facial
async function procesarImagenFacial() {
    try {
        if (!capturedImageBlob) {
            throw new Error('No se ha capturado ninguna imagen');
        }
        
        // Comprobar nuevamente que solo hay un rostro
        if (faceCount !== 1) {
            throw new Error('Se requiere exactamente un rostro para el registro facial');
        }
        
        document.getElementById('faceIdStatus').textContent = 'Procesando imagen...';
        document.getElementById('confirmFaceBtn').disabled = true;
        
        console.log('Enviando imagen al servidor para procesar...');
        
        // Enviar el Blob al servidor
        const formData = new FormData();
        formData.append('image', capturedImageBlob, 'face.jpg');
        
        const response = await fetch(`${API_URL}/face/process-blob`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        console.log('Respuesta del servidor:', data);
        
        if (!data.success) {
            throw new Error(data.error || 'Error al procesar la imagen facial');
        }
        
        // Almacenar el token facial
        faceToken = data.faceToken;
        console.log('Token facial obtenido correctamente:', faceToken ? 'SÍ' : 'NO');
        
        // Mostrar mensaje de éxito
        document.getElementById('faceIdCapture').classList.add('d-none');
        document.getElementById('faceIdSuccess').classList.remove('d-none');
        
        // Limpiar URL de objeto creado anteriormente
        const previewElement = document.getElementById('faceCapturePreview');
        if (previewElement.dataset.blobUrl) {
            URL.revokeObjectURL(previewElement.dataset.blobUrl);
        }
        
        // Detener la cámara
        detenerCamara();
        
        return faceToken;
    } catch (error) {
        console.error('Error al procesar imagen facial:', error);
        mostrarMensaje(error.message, 'danger');
        document.getElementById('confirmFaceBtn').disabled = false;
        throw error;
    }
}

// Función para registrar un usuario
async function registrarUsuario(datosUsuario) {
    try {
        // Si hay un token facial disponible, incluirlo en los datos del usuario
        if (faceToken) {
            datosUsuario.faceToken = faceToken;
            console.log('Incluyendo token facial en el registro');
        } else {
            console.log('No hay token facial disponible para incluir en el registro');
        }
        
        console.log('Datos a enviar para registro:', datosUsuario);
        
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(datosUsuario)
        });

        const data = await response.json();
        console.log('Respuesta del registro:', data);
        
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
        
        // Añadir bandera de sesión recién iniciada
        localStorage.setItem('sessionJustStarted', 'true');

        return data;
    } catch (error) {
        console.error('Error de inicio de sesión:', error);
        throw error;
    }
}

// Función para cerrar sesión
function cerrarSesion() {
    // Borrar todo el contenido del localStorage
    localStorage.clear();
    window.location.href = 'login.html';
}

// Exponer la función cerrarSesion al ámbito global para que pueda ser utilizada por el asistente
window.cerrarSesion = cerrarSesion;

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

// Función para autenticar con Face ID
async function autenticarConFaceId() {
    try {
        // Activar cámara
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 }, // Mayor resolución para mejor calidad
                height: { ideal: 720 },
                facingMode: "user"
            },
            audio: false
        });
        
        // Configurar video
        const video = document.getElementById('faceIdCamera');
        video.srcObject = stream;
        
        // Esperar a que el video esté listo
        await new Promise(resolve => {
            video.onloadedmetadata = resolve;
        });
        await video.play();
        
        // Cambiar estado visual
        document.getElementById('faceIdInitial').classList.add('d-none');
        document.getElementById('faceIdScanning').classList.remove('d-none');
        
        // Esperar un momento para dar impresión de "escaneo"
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Capturar imagen como Blob
        const canvas = document.getElementById('faceIdCanvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        
        // Obtener Blob de la imagen en alta calidad
        const imageBlob = await new Promise(resolve => {
            canvas.toBlob(resolve, 'image/jpeg', 0.95);
        });
        
        // Detener la cámara
        stream.getTracks().forEach(track => track.stop());
        
        // Verificar la cantidad de rostros
        try {
            const formData = new FormData();
            formData.append('image', imageBlob, 'face.jpg');
            
            const faceCountResponse = await fetch(`${API_URL}/face/count-blob`, {
                method: 'POST',
                body: formData
            });
            
            const faceResult = await faceCountResponse.json();
            
            if (!faceResult.success) {
                throw new Error(faceResult.error || 'Error al verificar rostros');
            }
            
            const faceCount = faceResult.faceCount;
            
            // Caso: 0 rostros
            if (faceCount === 0) {
                throw new Error('No se ha detectado ninguna cara. Inténtalo de nuevo.');
            }
            
            // Caso: 2+ rostros
            if (faceCount > 1) {
                throw new Error('Se detectaron múltiples personas. Por favor, intenta nuevamente con una sola persona en la cámara.');
            }
            
            // Si llegamos aquí, hay exactamente 1 rostro (caso ideal)
            console.log('Rostro único detectado, procediendo con la autenticación...');
            
        } catch (faceError) {
            console.error('Error en verificación de rostros:', faceError);
            throw faceError; // Propagar el error para ser manejado en el catch principal
        }
        
        // Enviar al servidor para autenticación facial
        const loginFormData = new FormData();
        loginFormData.append('image', imageBlob, 'face.jpg');
        
        const response = await fetch(`${API_URL}/auth/face-login-blob`, {
            method: 'POST',
            body: loginFormData
        });
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'No se pudo verificar la identidad');
        }
        
        // Mostrar éxito
        document.getElementById('faceIdScanning').classList.add('d-none');
        document.getElementById('faceIdSuccess').classList.remove('d-none');
        
        // Guardar token en localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('sessionJustStarted', 'true');
        localStorage.setItem('voiceWarningBannerDismissed', 'false');
        
        // Redireccionar después de un momento
        setTimeout(() => {
            window.location.href = 'interfaz.html';
        }, 1500);
        
    } catch (error) {
        console.error('Error en autenticación facial:', error);
        
        // Mostrar error
        document.getElementById('faceIdScanning').classList.add('d-none');
        document.getElementById('faceIdInitial').classList.add('d-none');
        document.getElementById('faceIdError').classList.remove('d-none');
        document.getElementById('retryFaceIdBtn').classList.remove('d-none');
        
        // Personalizar mensaje de error según corresponda
        let mensajeError = '';
        let tipoAlerta = 'warning';
        
        if (error.name === 'NotAllowedError') {
            mensajeError = 'Se requiere acceso a la cámara para utilizar Face ID';
        } else if (error.message.includes('No hay usuarios registrados con Face ID')) {
            mensajeError = '¿Aún no tienes cuenta? Regístrate primero para usar Face ID';
            
            // Cambiar el mensaje en el modal
            document.querySelector('#faceIdError h5').textContent = 'No hay usuarios con Face ID';
            document.querySelector('#faceIdError p').textContent = 
                'Necesitas registrarte y configurar Face ID antes de poder usar este método de inicio de sesión.';
            
            // Ocultar botón de reintentar y cambiar botón para ir a registro
            document.getElementById('retryFaceIdBtn').classList.add('d-none');
            
            // Agregar botón de registro si no existe
            if (!document.getElementById('goToRegisterBtn')) {
                const footerModal = document.querySelector('#faceIdModal .modal-footer');
                const registerBtn = document.createElement('button');
                registerBtn.id = 'goToRegisterBtn';
                registerBtn.className = 'btn btn-success';
                registerBtn.textContent = 'Registrarme';
                registerBtn.onclick = function() {
                    window.location.href = 'registro.html';
                };
                footerModal.appendChild(registerBtn);
            } else {
                document.getElementById('goToRegisterBtn').classList.remove('d-none');
            }
        } else if (error.message.includes('No se ha detectado ninguna cara')) {
            mensajeError = 'No se detectó ningún rostro en la imagen. Asegúrate de estar bien iluminado y centrado en la cámara.';
            
            document.querySelector('#faceIdError h5').textContent = 'No se detectó rostro';
            document.querySelector('#faceIdError p').textContent = 
                'No se detectó ninguna cara en la imagen. Asegúrate de estar bien iluminado y centrado en la cámara.';
        } else if (error.message.includes('Se detectaron múltiples personas')) {
            mensajeError = 'Se detectaron múltiples personas. Por favor, intenta nuevamente estando solo frente a la cámara.';
            
            document.querySelector('#faceIdError h5').textContent = 'Múltiples rostros detectados';
            document.querySelector('#faceIdError p').textContent = 
                'Se detectaron varias personas en la imagen. Por favor, asegúrate de estar solo frente a la cámara.';
        } else {
            mensajeError = 'Error al verificar identidad. Usa email y contraseña para iniciar sesión.';
        }
        
        mostrarMensaje(mensajeError, tipoAlerta);
    }
}

// Modificar la sección del botón de cancelar en el DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    // Verificar si estamos en la página de registro
    const startCameraBtn = document.getElementById('startCameraBtn');
    if (startCameraBtn) {
        startCameraBtn.addEventListener('click', iniciarCamara);
        
        document.getElementById('captureFaceBtn').addEventListener('click', capturarFoto);
        
        document.getElementById('confirmFaceBtn').addEventListener('click', procesarImagenFacial);
        
        document.getElementById('cancelCaptureBtn').addEventListener('click', function() {
            // Solo detener cámara si se cancela completamente
            if (!document.getElementById('faceCapturePreview').classList.contains('d-none')) {
                // Si estamos en vista previa, solo volvemos a la cámara
                document.getElementById('faceCapturePreview').classList.add('d-none');
                document.getElementById('cameraFeed').classList.remove('d-none');
                document.getElementById('captureFaceBtn').classList.remove('d-none');
                document.getElementById('confirmFaceBtn').classList.add('d-none');
                document.getElementById('faceIdStatus').textContent = 'Coloca tu rostro en el centro y mira directamente a la cámara';
            } else {
                // Cancelar completamente
                detenerCamara();
            }
        });
        
        document.getElementById('recaptureFaceBtn').addEventListener('click', function() {
            console.log('Reiniciando proceso de captura facial...');
            document.getElementById('faceIdCapture').classList.remove('d-none');
            document.getElementById('faceIdSuccess').classList.add('d-none');
            
            // Reiniciar la variable que guarda el token
            faceToken = null;
            capturedImage = null;
            
            // Iniciar la cámara nuevamente
            iniciarCamara();
        });
    }

    // Configurar Face ID login si estamos en la página de login
    const faceIdLoginBtn = document.getElementById('faceIdLoginBtn');
    if (faceIdLoginBtn) {
        // Crear modal si no existe ya
        let faceIdModal = document.getElementById('faceIdModal');
        if (!faceIdModal) {
            const modalHTML = `
                <!-- Modal para Face ID -->
                <div class="modal fade" id="faceIdModal" tabindex="-1" aria-labelledby="faceIdModalLabel" aria-hidden="true">
                    <!-- Contenido del modal... -->
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            faceIdModal = document.getElementById('faceIdModal');
        }
        
        // Inicializar modal de Bootstrap
        const bootstrapModal = new bootstrap.Modal(faceIdModal);
        
        // Configurar botón de Face ID
        faceIdLoginBtn.addEventListener('click', function() {
            // Reiniciar estados
            document.getElementById('faceIdInitial').classList.remove('d-none');
            document.getElementById('faceIdScanning').classList.add('d-none');
            document.getElementById('faceIdSuccess').classList.add('d-none');
            document.getElementById('faceIdError').classList.add('d-none');
            document.getElementById('retryFaceIdBtn').classList.add('d-none');
            
            // Mostrar modal
            bootstrapModal.show();
            
            // Iniciar proceso después de un breve retraso
            setTimeout(() => {
                autenticarConFaceId();
            }, 1000);
        });
        
        // Configurar botón para reintentar
        const retryBtn = document.getElementById('retryFaceIdBtn');
        if (retryBtn) {
            retryBtn.addEventListener('click', autenticarConFaceId);
        }
        
        // Configurar botón para cancelar
        const cancelBtn = document.querySelector('#faceIdModal .modal-footer .btn-secondary');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function() {
                // Asegurar que la cámara se detiene si el modal se cierra
                const video = document.getElementById('faceIdCamera');
                if (video && video.srcObject) {
                    video.srcObject.getTracks().forEach(track => track.stop());
                }
                
                // Restablecer el modal para futuros usos
                document.getElementById('faceIdInitial').classList.remove('d-none');
                document.getElementById('faceIdScanning').classList.add('d-none');
                document.getElementById('faceIdSuccess').classList.add('d-none');
                document.getElementById('faceIdError').classList.add('d-none');
                document.getElementById('retryFaceIdBtn').classList.add('d-none');
                
                // Eliminar el botón de registro si existe
                const registerBtn = document.getElementById('goToRegisterBtn');
                if (registerBtn) {
                    registerBtn.classList.add('d-none');
                }
            });
        }
        
        // Reiniciar si se cierra el modal
        faceIdModal.addEventListener('hidden.bs.modal', function() {
            // Asegurar que la cámara se detiene si el modal se cierra
            const video = document.getElementById('faceIdCamera');
            if (video.srcObject) {
                video.srcObject.getTracks().forEach(track => track.stop());
            }
        });
    }
});