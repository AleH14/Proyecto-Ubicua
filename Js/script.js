// Funcionalidad del asistente virtual (chat y voz)
document.addEventListener('DOMContentLoaded', function() {
    // Elementos DOM
    const assistantBtn = document.getElementById('assistantBtn');
    const chatPanel = document.getElementById('chatPanel');
    const closeChatBtn = document.getElementById('closeChatBtn');
    const voiceToggleBtn = document.getElementById('voiceToggleBtn');
    const chatInput = document.getElementById('chatInput');
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    const chatBody = document.getElementById('chatBody');
    
    // Estado de la aplicación
    let isListening = false;
    let isSpeakingEnabled = false;
    let currentUtterance = null;
    
    // Crear botón de síntesis de voz
    const textToSpeechBtn = document.createElement('button');
    textToSpeechBtn.className = 'btn btn-sm text-white';
    textToSpeechBtn.id = 'textToSpeechBtn';
    textToSpeechBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
    textToSpeechBtn.title = "Escuchar respuestas";
    
    // Añadir el botón a la interfaz después del botón de micrófono
    document.querySelector('.chat-header div').insertBefore(
        textToSpeechBtn, 
        closeChatBtn
    );
    
    // Manejar el clic en el botón de síntesis
    textToSpeechBtn.addEventListener('click', function() {
        isSpeakingEnabled = !isSpeakingEnabled;
        textToSpeechBtn.innerHTML = isSpeakingEnabled ? 
            '<i class="fas fa-volume-up"></i>' : 
            '<i class="fas fa-volume-mute"></i>';
        
        // Si estaba hablando, detener
        if (currentUtterance) {
            window.speechSynthesis.cancel();
            currentUtterance = null;
        }
        
        if (isSpeakingEnabled) {
            // Informar al usuario que la función está activada
            addMessage("Síntesis de voz activada. Ahora escucharás mis respuestas.", "assistant");
        }
    });
    
    // Función para convertir texto a voz
    function speakText(text) {
        // Cancelar cualquier síntesis anterior
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }
        
        // Crear nueva instancia de síntesis
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        
        // Obtener voces disponibles (en español preferiblemente)
        const voices = window.speechSynthesis.getVoices();
        const spanishVoice = voices.find(voice => voice.lang.includes('es'));
        if (spanishVoice) {
            utterance.voice = spanishVoice;
        }
        
        // Guardar referencia a la utterance actual
        currentUtterance = utterance;
        
        // Limpiar cuando termina
        utterance.onend = function() {
            currentUtterance = null;
        };
        
        // Reproducir audio
        window.speechSynthesis.speak(utterance);
    }
    
    // Asegurarse de que las voces estén cargadas
    if (window.speechSynthesis) {
        let voices = [];
        
        function populateVoiceList() {
            voices = window.speechSynthesis.getVoices();
        }
        
        populateVoiceList();
        
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = populateVoiceList;
        }
    }
    
    // Función para agregar mensaje al chat (modificada para incluir síntesis de voz)
    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender);
        
        const messageContent = document.createElement('div');
        messageContent.classList.add('message-content');
        messageContent.textContent = text;
        
        messageDiv.appendChild(messageContent);
        chatBody.appendChild(messageDiv);
        
        // Scroll al final
        chatBody.scrollTop = chatBody.scrollHeight;
        
        // Si es mensaje del asistente y está habilitada la síntesis de voz
        if (sender === 'assistant' && isSpeakingEnabled && text) {
            speakText(text);
        }
    }
    
    // Función para abrir/cerrar el panel de chat
    assistantBtn.addEventListener('click', function() {
        chatPanel.style.display = chatPanel.style.display === 'none' || chatPanel.style.display === '' ? 'flex' : 'none';
    });
    
    // Cerrar chat al hacer clic en el botón de cerrar
    closeChatBtn.addEventListener('click', function() {
        chatPanel.style.display = 'none';
        
        // Detener cualquier síntesis en curso al cerrar el chat
        if (currentUtterance) {
            window.speechSynthesis.cancel();
            currentUtterance = null;
        }
    });
    
    // Enviar mensaje al hacer clic en el botón de enviar
    sendMessageBtn.addEventListener('click', sendMessage);
    
    // Enviar mensaje al presionar Enter
    chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Función para enviar mensaje
    async function sendMessage() {
        const message = chatInput.value.trim();
        if (message === '') return;
        
        // Agregar mensaje del usuario al chat
        addMessage(message, 'user');
        chatInput.value = '';
        
        const loadingId = showLoading();
        
        try {
            // Obtener token de autenticación
            const token = localStorage.getItem('token');
            
            if (!token) {
                removeLoading(loadingId);
                addMessage("Por favor, inicia sesión para usar el asistente personalizado", "assistant");
                return;
            }
            
            // Configura la solicitud con el token en el encabezado
            const response = await fetch('http://localhost:5000/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ message: message })
            });
            
            removeLoading(loadingId);
            
            if (!response.ok) {
                if (response.status === 401) {
                    addMessage("Tu sesión ha expirado. Por favor, vuelve a iniciar sesión.", "assistant");
                } else {
                    addMessage("Hubo un problema al procesar tu solicitud.", "assistant");
                }
                return;
            }
            
            const data = await response.json();
            
            // Comprobar si la respuesta incluye una acción
            if (data.action) {
                addMessage(data.response, 'assistant');
                
                // Ejecutar la acción después de un breve retardo para que el usuario vea el mensaje
                setTimeout(() => {
                    if (data.action === 'logout') {
                        cerrarSesion(); // La función existente para cerrar sesión
                    } else if (data.action === 'navigate' && data.target) {
                        // Navegar a la categoría especificada
                        window.location.href = `Categorias/categorias.html?categoria=${data.target}`;
                    } else if (data.action === 'navigate_to') {
                        // Navegar a páginas específicas del sistema
                        switch(data.target) {
                            case 'profile':
                                window.location.href = 'profile.html';
                                break;
                            case 'orders':
                                window.location.href = 'mis-compras.html';
                                break;
                            default:
                                addMessage('No pude encontrar esa página.', 'assistant');
                        }
                    }
                }, 1500);
            } else {
                // Respuesta normal
                addMessage(data.response, 'assistant');
            }
        } catch (error) {
            removeLoading(loadingId);
            console.error('Error:', error);
            addMessage('Lo siento, ha ocurrido un error de conexión.', 'assistant');
        }
    }
    
    // Función para mostrar indicador de carga mientras se procesa la respuesta
    function showLoading() {
        const loadingId = 'loading-' + Date.now();
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', 'assistant');
        messageDiv.id = loadingId;
        
        const messageContent = document.createElement('div');
        messageContent.classList.add('message-content');
        messageContent.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
        
        messageDiv.appendChild(messageContent);
        chatBody.appendChild(messageDiv);
        
        // Scroll al final
        chatBody.scrollTop = chatBody.scrollHeight;
        
        return loadingId;
    }
    
    // Función para remover el indicador de carga
    function removeLoading(loadingId) {
        const loadingElement = document.getElementById(loadingId);
        if (loadingElement) {
            loadingElement.remove();
        }
    }
    
    // Funcionalidad del botón de voz
    voiceToggleBtn.addEventListener('click', function() {
        if (!isListening) {
            // Comenzar a escuchar
            startListening();
        } else {
            // Dejar de escuchar
            stopListening();
        }
    });
    
    // Función para comenzar a escuchar
    function startListening() {
        if (!('webkitSpeechRecognition' in window)) {
            addMessage('Lo siento, tu navegador no soporta reconocimiento de voz.', 'assistant');
            return;
        }
        
        isListening = true;
        voiceToggleBtn.innerHTML = '<i class="fas fa-stop"></i>';
        assistantBtn.classList.add('active');
        
        // Agregar indicador de escucha
        const listeningDiv = document.createElement('div');
        listeningDiv.classList.add('listening-indicator');
        listeningDiv.id = 'listeningIndicator';
        listeningDiv.innerHTML = 'Escuchando <span></span><span></span><span></span>';
        chatBody.appendChild(listeningDiv);
        chatBody.scrollTop = chatBody.scrollHeight;
        
        const recognition = new webkitSpeechRecognition();
        recognition.lang = 'es-ES';
        recognition.continuous = false;
        recognition.interimResults = false;
        
        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            chatInput.value = transcript;
            stopListening();
            sendMessage();
        };
        
        recognition.onerror = function(event) {
            console.error('Error de reconocimiento de voz:', event.error);
            stopListening();
            addMessage('Lo siento, hubo un error al reconocer tu voz.', 'assistant');
        };
        
        recognition.start();
    }
    
    // Función para dejar de escuchar
    function stopListening() {
        isListening = false;
        voiceToggleBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        assistantBtn.classList.remove('active');
        
        // Remover indicador de escucha
        const listeningIndicator = document.getElementById('listeningIndicator');
        if (listeningIndicator) {
            listeningIndicator.remove();
        }
    }
});