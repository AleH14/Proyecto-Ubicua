document.addEventListener('DOMContentLoaded', function() {
    // Referencia al botón de asistente de voz
    const voiceAssistantBtn = document.getElementById('voiceAssistantBtn');
    
    // Estado del reconocimiento de voz
    let isListening = false;
    let recognition = null;
    
    // Verificar si el navegador soporta reconocimiento de voz
    const hasSpeechRecognition = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    
    if (!hasSpeechRecognition) {
        // Si no hay soporte, ocultar el botón
        voiceAssistantBtn.style.display = 'none';
    }
    
    // Evento de clic en el botón de asistente de voz
    voiceAssistantBtn.addEventListener('click', function() {
        // Verificar si el panel de chat está visible
        const chatPanel = document.getElementById('chatPanel');
        if (chatPanel.style.display === 'none' || chatPanel.style.display === '') {
            // Mostrar el panel de chat si está oculto
            document.getElementById('assistantBtn').click();
            
            // Pequeña pausa para que se muestre el panel
            setTimeout(() => {
                toggleVoiceRecognition();
            }, 300);
        } else {
            // Si el panel ya está visible, solo toggle el reconocimiento
            toggleVoiceRecognition();
        }
    });
    
    // Función para alternar el reconocimiento de voz
    function toggleVoiceRecognition() {
        if (!isListening) {
            startVoiceRecognition();
        } else {
            stopVoiceRecognition();
        }
    }
    
    // Función para iniciar el reconocimiento de voz
    function startVoiceRecognition() {
        if (!hasSpeechRecognition) return;
        
        // Usar la implementación existente del reconocimiento de voz si es posible
        const voiceToggleBtn = document.getElementById('voiceToggleBtn');
        
        if (voiceToggleBtn) {
            // Usar el botón existente para activar el reconocimiento
            voiceToggleBtn.click();
            
            // Actualizar estado visual del botón de voz directo
            voiceAssistantBtn.classList.add('listening');
            isListening = true;
            
            return;
        }
        
        // Si no podemos usar la implementación existente, crear una nueva
        isListening = true;
        voiceAssistantBtn.classList.add('listening');
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.lang = 'es-ES';
        recognition.continuous = false;
        recognition.interimResults = false;
        
        recognition.onstart = function() {
            // Mostrar alguna indicación visual de que estamos escuchando
            addMessage("Te escucho...", "assistant");
        };
        
        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            
            // Añadir mensaje del usuario al chat
            addMessage(transcript, "user");
            
            // Detener reconocimiento
            stopVoiceRecognition();
            
            // Simular envío de mensaje (usando la función existente si está disponible)
            const sendBtn = document.getElementById('sendMessageBtn');
            const chatInput = document.getElementById('chatInput');
            
            if (chatInput && sendBtn) {
                chatInput.value = transcript;
                sendBtn.click();
            }
        };
        
        recognition.onerror = function(event) {
            console.error("Error en reconocimiento de voz: ", event.error);
            addMessage("Lo siento, no pude entender. ¿Puedes intentarlo de nuevo?", "assistant");
            stopVoiceRecognition();
        };
        
        recognition.onend = function() {
            stopVoiceRecognition();
        };
        
        recognition.start();
    }
    
    // Función para detener el reconocimiento de voz
    function stopVoiceRecognition() {
        isListening = false;
        voiceAssistantBtn.classList.remove('listening');
        
        // Si usamos la implementación existente, detener desde ahí
        const voiceToggleBtn = document.getElementById('voiceToggleBtn');
        if (isListening && voiceToggleBtn) {
            voiceToggleBtn.click();
            return;
        }
        
        // Detener nuestro propio reconocimiento si existe
        if (recognition) {
            recognition.stop();
            recognition = null;
        }
    }
    
    // Función auxiliar para añadir mensajes al chat
    function addMessage(text, sender) {
        const chatBody = document.getElementById('chatBody');
        if (!chatBody) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender);
        
        const messageContent = document.createElement('div');
        messageContent.classList.add('message-content');
        messageContent.textContent = text;
        
        messageDiv.appendChild(messageContent);
        chatBody.appendChild(messageDiv);
        
        // Scroll al final
        chatBody.scrollTop = chatBody.scrollHeight;
    }
});