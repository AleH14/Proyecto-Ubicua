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
    let voicesLoaded = false;
    let maleSpanishVoice = null;
    
    // Referencia al botón de síntesis de voz
    const speakToggleBtn = document.getElementById('speakToggleBtn');

    // Función para actualizar el estado visual del botón de síntesis
    function updateSpeakButtonUI() {
        if (isSpeakingEnabled) {
            speakToggleBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
            speakToggleBtn.setAttribute('title', 'Desactivar voz');
        } else {
            speakToggleBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
            speakToggleBtn.setAttribute('title', 'Activar voz');
        }
    }

    // Evento para el botón de síntesis de voz
    if (speakToggleBtn) {
        speakToggleBtn.addEventListener('click', function() {
            isSpeakingEnabled = !isSpeakingEnabled;
            updateSpeakButtonUI();
            
            // Guardar preferencia en localStorage
            localStorage.setItem('speechEnabled', isSpeakingEnabled);
            
            // Notificar al usuario del cambio
            const message = isSpeakingEnabled ? 
                "Síntesis de voz activada." : 
                "Síntesis de voz desactivada.";
            addMessage(message, 'assistant', isSpeakingEnabled);
        });
    }

    // Cargar preferencia guardada
    const savedSpeechPref = localStorage.getItem('speechEnabled');
    if (savedSpeechPref !== null) {
        isSpeakingEnabled = savedSpeechPref === 'true';
        // Actualizaremos la UI después de que se cargue el DOM completamente
    }
    
    // Limpiar el chat 
    chatBody.innerHTML = '';
    
    // Obtener el usuario del localStorage
    const user = obtenerUsuario();
    let welcomeMessage = "Hola ¿En qué puedo ayudarte hoy?";
    
    // Si hay un usuario logueado, personalizar el mensaje
    if (user && user.nombre) {
        welcomeMessage = `¡Bienvenido ${user.nombre}! ¿Qué quieres comer ahora?`;
    }
    
    // Función para inicializar voces y mostrar bienvenida
    function initializeVoicesAndWelcome() {
        // Buscar una voz masculina en español
        const voices = window.speechSynthesis.getVoices();
        
        maleSpanishVoice = voices.find(voice => 
            voice.lang.includes('es') && 
            (voice.name.includes('Male') || 
             voice.name.includes('male') ||
             voice.name.includes('hombre') || 
             voice.name.includes('Diego') ||
             voice.name.includes('Carlos') ||
             voice.name.includes('Miguel') ||
             voice.name.includes('Juan'))
        );
        
        if (maleSpanishVoice) {
            console.log("Voz masculina encontrada:", maleSpanishVoice.name);
        } else {
            console.log("No se encontró voz masculina en español");
        }
        
        // Marcar como cargadas
        voicesLoaded = true;
        
        // Añadir el mensaje de bienvenida después de cargar las voces
        addMessage(welcomeMessage, 'assistant', true);
    }
    
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
        
        // Si ya tenemos una voz masculina identificada, usarla
        if (maleSpanishVoice) {
            utterance.voice = maleSpanishVoice;
            console.log("Usando voz masculina:", maleSpanishVoice.name);
        } 
        else {
            // Si no hay voz masculina, buscar cualquier voz en español
            const voices = window.speechSynthesis.getVoices();
            const spanishVoice = voices.find(voice => voice.lang.includes('es'));
            if (spanishVoice) {
                utterance.voice = spanishVoice;
                console.log("Usando voz en español:", spanishVoice.name);
            }
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
        // Checar si las voces ya están disponibles
        if (window.speechSynthesis.getVoices().length > 0) {
            initializeVoicesAndWelcome();
        }
        
        // Esto es necesario para Chrome
        window.speechSynthesis.onvoiceschanged = function() {
            if (!voicesLoaded) {
                initializeVoicesAndWelcome();
                
                // Listar voces para depuración
                const voices = window.speechSynthesis.getVoices();
                console.log("Voces disponibles:");
                voices.forEach(voice => {
                    console.log(`- ${voice.name} (${voice.lang})`);
                });
            }
        };
    } else {
        // Si no hay soporte para síntesis de voz, mostrar mensaje normal
        addMessage(welcomeMessage, 'assistant');
        console.log("Navegador no soporta síntesis de voz");
    }
    
    // Función para agregar mensaje al chat (modificada para incluir síntesis de voz)
    function addMessage(text, sender, isWelcome = false) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender);
        
        const messageContent = document.createElement('div');
        messageContent.classList.add('message-content');
        messageContent.textContent = text;
        
        messageDiv.appendChild(messageContent);
        chatBody.appendChild(messageDiv);
        
        // Scroll al final
        chatBody.scrollTop = chatBody.scrollHeight;
        
        // Si es mensaje del asistente y está habilitada la síntesis de voz O es mensaje de bienvenida
        if (sender === 'assistant' && (isSpeakingEnabled || isWelcome) && text) {
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
    
    // Actualizar estado del botón de síntesis al iniciar
    if (speakToggleBtn) {
        updateSpeakButtonUI();
    }
});