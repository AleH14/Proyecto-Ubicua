document.addEventListener('DOMContentLoaded', function() {
    // Elementos DOM
    const voiceAssistantBtn = document.getElementById('voiceAssistantBtn');
    const chatPanel = document.getElementById('chatPanel');
    const voiceToggleBtn = document.getElementById('voiceToggleBtn');
    
    if (!voiceAssistantBtn) return;

    // Variables de estado
    let isProcessingVoice = false;

    // Crear un observador para monitorizar cuando se está utilizando el reconocimiento de voz
    // Esto nos permite sincronizar el botón flotante con el estado del reconocimiento
    const listenObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                // Comprobar si se ha añadido o quitado el indicador de escucha
                const listeningIndicator = document.getElementById('listeningIndicator');
                if (listeningIndicator) {
                    // Si hay indicador de escucha, activar el botón flotante
                    voiceAssistantBtn.classList.add('listening');
                } else {
                    // Si no hay indicador de escucha, desactivar el botón flotante
                    voiceAssistantBtn.classList.remove('listening');
                }
            }
        });
    });

    // Configurar y iniciar el observador en el cuerpo del chat
    const chatBody = document.getElementById('chatBody');
    if (chatBody) {
        listenObserver.observe(chatBody, {
            childList: true,
            subtree: true
        });
    }

    // Evento de click para el botón de asistente de voz
    voiceAssistantBtn.addEventListener('click', async function() {
        // Si ya estamos procesando una solicitud, detener la escucha
        if (isProcessingVoice || voiceAssistantBtn.classList.contains('listening')) {
            if (typeof window.stopListening === 'function') {
                window.stopListening();
            }
            resetVoiceButton();
            return;
        }
        
        // Si el panel de chat está oculto, mostrarlo primero
        if (chatPanel && (chatPanel.style.display === 'none' || chatPanel.style.display === '')) {
            document.getElementById('assistantBtn').click();
            
            // Pequeña pausa para que se muestre el chat correctamente
            setTimeout(() => {
                activateVoiceRecognition();
            }, 300);
        } else {
            // El chat ya está visible
            activateVoiceRecognition();
        }
    });

    // Función para activar el reconocimiento de voz
    function activateVoiceRecognition() {
        // Verificar si existe la función startListening en el scope global
        if (typeof window.startListening === 'function') {
            isProcessingVoice = true;
            voiceAssistantBtn.classList.add('listening');
            
            // Si el modo de conversación está desactivado, forzar la activación del micrófono
            // (esto es necesario porque el micrófono no se activará automáticamente después)
            if (window.isAutoConversationEnabled === false) {
                window.startListening();
            } else {
                window.startListening(); 
            }
        } else {
            // Si no existe la función global, usar la API de Python
            processVoiceAssistant();
        }
    }

    // Función para procesar el asistente de voz usando la API
    async function processVoiceAssistant() {
        try {
            // Cambiar estado del botón a procesando
            isProcessingVoice = true;
            voiceAssistantBtn.classList.add('listening');
            
            // Mostrar indicador visual
            showProcessingIndicator();
            
            // Obtener el token de autenticación
            const token = localStorage.getItem('token');
            if (!token) {
                alert("Por favor, inicia sesión para usar el asistente de voz");
                resetVoiceButton();
                return;
            }

            // Configurar las opciones de la solicitud
            const requestOptions = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            };

            // Mostrar un mensaje al usuario
            const statusMsgId = showStatusMessage("Grabando audio... Habla ahora");
            
            // Realizar la petición al endpoint de reconocimiento de voz
            const response = await fetch('http://localhost:5000/voice-recognition', requestOptions);
            const data = await response.json();

            // Eliminar el mensaje de estado
            const statusMsg = document.getElementById(statusMsgId);
            if (statusMsg) statusMsg.remove();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Error en reconocimiento de voz');
            }

            // Enviar el texto reconocido al asistente
            sendTextToAssistant(data.text);
        } catch (error) {
            console.error('Error:', error);
            showStatusMessage(`Error: ${error.message}`);
            setTimeout(() => resetVoiceButton(), 3000);
        }
    }

    // Función para mostrar un indicador de procesamiento
    function showProcessingIndicator() {
        // Cambiar el icono a un indicador de carga
        voiceAssistantBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>';
    }

    // Función para mostrar un mensaje de estado
    function showStatusMessage(message) {
        // Abrir panel de chat si está cerrado
        showChatPanel();
        
        // Mostrar mensaje temporal en el panel de chat
        const chatBody = document.getElementById('chatBody');
        const statusMsgId = 'voice-status-' + Date.now();
        
        const statusDiv = document.createElement('div');
        statusDiv.id = statusMsgId;
        statusDiv.classList.add('message', 'assistant', 'status-message');
        
        const statusContent = document.createElement('div');
        statusContent.classList.add('message-content');
        statusContent.textContent = message;
        
        statusDiv.appendChild(statusContent);
        chatBody.appendChild(statusDiv);
        
        // Scroll al final
        chatBody.scrollTop = chatBody.scrollHeight;
        
        return statusMsgId;
    }

    // Función para resetear el botón de voz
    function resetVoiceButton() {
        isProcessingVoice = false;
        voiceAssistantBtn.classList.remove('listening');
        voiceAssistantBtn.innerHTML = '<i class="fas fa-microphone"></i>';
    }

    // Función para mostrar el panel de chat
    function showChatPanel() {
        const assistantBtn = document.getElementById('assistantBtn');
        
        // Si el panel está oculto, mostrarlo
        if (chatPanel.style.display === 'none' || chatPanel.style.display === '') {
            assistantBtn.click();
        }
    }

    // Función para enviar texto reconocido al asistente
    function sendTextToAssistant(text) {
        // Referenciar los elementos del chat
        const chatInput = document.getElementById('chatInput');
        const sendMessageBtn = document.getElementById('sendMessageBtn');
        
        if (chatInput && sendMessageBtn) {
            // Asignar el texto reconocido al campo de entrada
            chatInput.value = text;
            
            // Enviar el mensaje
            sendMessageBtn.click();
            
            // Resetear el botón de voz después de enviar
            resetVoiceButton();
        } else {
            console.error('No se encontraron los elementos del chat');
            resetVoiceButton();
        }
    }
});