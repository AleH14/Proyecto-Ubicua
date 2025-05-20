// Funcionalidad del asistente virtual (chat y voz)
document.addEventListener('DOMContentLoaded', function() {
    console.log("Inicializando asistente virtual - " + new Date().toLocaleTimeString());
    window.debugAssistant = function() {
        console.log({
            isListening,
            isSpeakingEnabled,
            isAutoConversationEnabled,
            hasPendingAction: pendingAction !== null,
            pendingAction,
            isSpeaking: window.speechSynthesis.speaking,
            chatPanelVisible: chatPanel.style.display !== 'none',
            userLoggedIn: !!localStorage.getItem('token')
        });
    };
    console.log("Para depurar el estado del asistente, ejecuta window.debugAssistant() en la consola");
    
    // Elementos DOM
    const assistantBtn = document.getElementById('assistantBtn');
    const chatPanel = document.getElementById('chatPanel');
    const closeChatBtn = document.getElementById('closeChatBtn');
    const voiceToggleBtn = document.getElementById('voiceToggleBtn');
    const chatInput = document.getElementById('chatInput');
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    const chatBody = document.getElementById('chatBody');
    
    // Estado de la aplicación (añadir esta nueva variable)
    let isListening = false;
    let isSpeakingEnabled = false;
    let isAutoConversationEnabled = true; // Por defecto activado
    let currentUtterance = null;
    let voicesLoaded = false;
    let helenaVoice = null; // Cambiado de maleSpanishVoice
    let pendingAction = null; // Nueva variable para controlar acciones pendientes
    
    // Referencias a botones (añadir esta nueva referencia)
    const speakToggleBtn = document.getElementById('speakToggleBtn');
    const autoConversationBtn = document.getElementById('autoConversationBtn');

    // AÑADIR: Exponer las funciones principales al scope global
    window.startListening = startListening;
    window.stopListening = stopListening;
    window.addMessage = addMessage;
    window.speakText = speakText;
    // Cambiar esto:
    // window.isAutoConversationEnabled = isAutoConversationEnabled; 

    // Por esto (para exponer la referencia, no solo el valor):
    Object.defineProperty(window, 'isAutoConversationEnabled', {
        get: function() { return isAutoConversationEnabled; },
        set: function(value) { isAutoConversationEnabled = value; }
    });

    // Función para actualizar el estado visual del botón de conversación automática
    function updateAutoConversationButtonUI() {
        if (isAutoConversationEnabled) {
            autoConversationBtn.classList.add('active');
            autoConversationBtn.setAttribute('title', 'Desactivar modo conversación');
        } else {
            autoConversationBtn.classList.remove('active');
            autoConversationBtn.setAttribute('title', 'Activar modo conversación');
        }
    }

    // Evento para el botón de modo conversación
    if (autoConversationBtn) {
        autoConversationBtn.addEventListener('click', function() {
            isAutoConversationEnabled = !isAutoConversationEnabled;
            updateAutoConversationButtonUI();
            
            // Guardar preferencia en localStorage
            localStorage.setItem('autoConversationEnabled', isAutoConversationEnabled);
            
            // Notificar al usuario del cambio
            const message = isAutoConversationEnabled ? 
                "Modo conversación activado. El asistente te escuchará automáticamente después de cada respuesta." : 
                "Modo conversación desactivado. Deberás hacer clic en el botón de micrófono para hablar.";
            addMessage(message, 'assistant', false); // No activar síntesis para este mensaje
        });
    }

    // Cargar preferencia guardada para modo conversación
    const savedAutoConversationPref = localStorage.getItem('autoConversationEnabled');
    if (savedAutoConversationPref !== null) {
        isAutoConversationEnabled = savedAutoConversationPref === 'true';
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
    
    // Verificar si acabamos de iniciar sesión
    const sessionJustStarted = localStorage.getItem('sessionJustStarted') === 'true';
    if (sessionJustStarted) {
        console.log("Sesión recién iniciada detectada");
        // Activar síntesis de voz por defecto si acaba de iniciar sesión
        isSpeakingEnabled = true;
        localStorage.setItem('speechEnabled', 'true');
        updateSpeakButtonUI();
        
        // Intentar desbloquear audio automáticamente
        try {
            const audio = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA");
            const playPromise = audio.play();
            
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        console.log("Audio desbloqueado automáticamente");
                        firstInteractionDone = true;
                        
                        // Forzar reproducción del mensaje de bienvenida aquí, después de desbloquear audio
                        if (voicesLoaded) {
                            console.log("Reproduciendo mensaje de bienvenida después de desbloqueo de audio");
                            // Dar un pequeño tiempo para que todo esté listo
                            setTimeout(() => {
                                speakText(welcomeMessage);
                            }, 300);
                        }
                        
                        // Limpiar mensaje de sistema si existe
                        setTimeout(() => {
                            const infoMsg = document.querySelector('.message.system');
                            if (infoMsg) {
                                infoMsg.remove();
                            }
                        }, 1000);
                    })
                    .catch(e => {
                        console.log("No se pudo desbloquear audio automáticamente:", e);
                    });
            }
        } catch (e) {
            console.error("Error al intentar desbloquear audio:", e);
        }
        
        // IMPORTANTE: No eliminar la bandera aquí, sino después de que se haya intentado hablar
        // La eliminaremos en la función speakText cuando detecte que sessionJustStarted es true
    }
    
    // Función para inicializar voces y mostrar bienvenida
    function initializeVoicesAndWelcome() {
        // Buscar específicamente la voz de Helena
        const voices = window.speechSynthesis.getVoices();
        
        helenaVoice = voices.find(voice => 
            voice.name === "Microsoft Helena - Spanish (Spain)"
        );
        
        if (helenaVoice) {
            console.log("Voz de Helena encontrada:", helenaVoice.name);
        } else {
            console.log("No se encontró la voz de Microsoft Helena");
        }
        
        // Marcar como cargadas
        voicesLoaded = true;
        
        // MODIFICADO: Añadir el mensaje de bienvenida CON síntesis de voz
        addMessage(welcomeMessage, 'assistant', sessionJustStarted || true);
        
        // Si no pudimos activar el audio automáticamente pero acabamos de iniciar sesión
        // mostrar un mensaje más destacado para pedir interacción
        if (sessionJustStarted && !firstInteractionDone) {
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('message', 'system', 'highlight');
            messageDiv.innerHTML = '<div class="message-content"><i class="fas fa-exclamation-circle"></i> <strong>¡Haz clic en cualquier parte para activar la voz!</strong></div>';
            chatBody.appendChild(messageDiv);
        } else {
            // Mensaje normal de interacción necesaria
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('message', 'system');
            messageDiv.innerHTML = '<div class="message-content"><i class="fas fa-info-circle"></i> Haz clic en cualquier lugar para activar la síntesis de voz.</div>';
            chatBody.appendChild(messageDiv);
        }
    }
    
    // Añadir detector de interacción para activar síntesis
    let firstInteractionDone = false;
    document.addEventListener('click', function() {
        if (!firstInteractionDone) {
            firstInteractionDone = true;
            console.log("Primera interacción detectada - audio desbloqueado");
            
            // Opcional: Reproducir un audio silencioso para "desbloquear" el audio
            try {
                const audio = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA");
                audio.play().catch(e => console.log("Audio de desbloqueo falló:", e));
                
                // También podemos ejecutar una síntesis vacía para inicializar el sistema
                window.speechSynthesis.cancel();
                
                // Opcionalmente, dar feedback al usuario
                const infoMsg = document.querySelector('.message.system');
                if (infoMsg) {
                    infoMsg.innerHTML = '<div class="message-content"><i class="fas fa-check-circle"></i> ¡Síntesis de voz activada correctamente!</div>';
                    setTimeout(() => {
                        if (infoMsg.parentNode) {
                            infoMsg.remove();
                        }
                    }, 3000);
                }
            } catch (e) {
                console.error("Error al desbloquear audio:", e);
            }
        }
    }, {once: false});
    
    // Función para convertir texto a voz
    function speakText(text) {
        // Cancelar cualquier síntesis anterior
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }
        
        // Si no está habilitada la síntesis de voz, ejecutar acción pendiente si existe y salir
        if (!isSpeakingEnabled) {
            if (pendingAction) {
                console.log("Síntesis no habilitada pero hay acción pendiente, ejecutando:", pendingAction);
                setTimeout(() => {
                    executeAction(pendingAction);
                    pendingAction = null;
                }, 100);
            }
            return;
        }
        
        // MODIFICAR ESTA PARTE: Comprobar si venimos de inicio de sesión
        const sessionJustStarted = localStorage.getItem('sessionJustStarted') === 'true';
        
        // Verificar si ya hubo interacción o si venimos de inicio de sesión
        if (!firstInteractionDone && !sessionJustStarted) {
            console.warn("Intentando sintetizar voz sin interacción previa del usuario");
            // Mostrar un mensaje solicitando interacción
            const systemMsg = document.createElement('div');
            systemMsg.classList.add('message', 'system', 'highlight');
            systemMsg.innerHTML = '<div class="message-content"><i class="fas fa-exclamation-circle"></i> <strong>¡Haz clic en cualquier lugar de la página para activar la voz!</strong></div>';
            chatBody.appendChild(systemMsg);
            chatBody.scrollTop = chatBody.scrollHeight;
            return;
        }
        
        // Si venimos de inicio de sesión, marcar como que hubo interacción
        if (sessionJustStarted) {
            console.log("Sesión recién iniciada, forzando activación de audio");
            firstInteractionDone = true;
            // Ahora sí eliminamos la bandera, después de intentar hablar
            localStorage.removeItem('sessionJustStarted');
        }
        
        // Crear nueva instancia de síntesis
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        
        // Asignar la voz de Helena
        if (helenaVoice) {
            utterance.voice = helenaVoice;
            console.log("Usando voz de Helena:", helenaVoice.name);
        } else {
            console.log("Voz de Helena no disponible, usando voz predeterminada");
        }
        
        // Guardar referencia a la utterance actual
        currentUtterance = utterance;
        
        // Log del estado actual
        const pendingActionStr = pendingAction ? `${pendingAction.action} - ${pendingAction.target}` : 'ninguna';
        console.log(`Iniciando síntesis. Modo conversación: ${isAutoConversationEnabled}. Acción pendiente: ${pendingActionStr}`);
        
        // Evento al terminar de hablar
        utterance.onend = function() {
            console.log("Síntesis finalizada");
            currentUtterance = null;
            
            // Si hay una acción pendiente, ejecutarla ahora
            if (pendingAction) {
                console.log("Ejecutando acción pendiente después de hablar:", pendingAction);
                
                // Usar setTimeout para evitar problemas de timing
                setTimeout(() => {
                    const actionToExecute = {...pendingAction}; // Copiar para evitar problemas de referencia
                    pendingAction = null; // Limpiar ANTES de ejecutar para evitar recursión
                    executeAction(actionToExecute);
                }, 200);
                
                return; // Importante: no continuar con la activación automática del micrófono
            }
            
            // Si no hay acción pendiente, considerar activar el micrófono
            setTimeout(() => {
                // Solo activar si el chat está visible, hay usuario logueado y el modo conversación está activo
                if (chatPanel.style.display !== 'none' && localStorage.getItem('token') && isAutoConversationEnabled) {
                    console.log("Activando micrófono automáticamente para continuar conversación");
                    startListening();
                } else {
                    console.log("No se activa micrófono automáticamente:", {
                        panelVisible: chatPanel.style.display !== 'none',
                        userLoggedIn: !!localStorage.getItem('token'),
                        autoMode: isAutoConversationEnabled
                    });
                }
            }, 500);
        };
        
        // Capturar errores de síntesis
        utterance.onerror = function(event) {
            // Ignorar errores de tipo "interrupted" cuando son intencionales
            if (event.error === 'interrupted' && !chatPanel.style.display || chatPanel.style.display === 'none') {
                console.log("Síntesis interrumpida intencionalmente al cerrar el chat");
                currentUtterance = null;
                return; // No mostrar error ni ejecutar acciones pendientes
            }
            
            console.error("Error en síntesis de voz:", event);
            console.error("Mensaje que causó el error:", text);
            console.error("Estado actual del asistente:", {
                isSpeaking: window.speechSynthesis.speaking,
                isPaused: window.speechSynthesis.paused,
                pendingAction
            });
            
            currentUtterance = null;
            
            // Si hay acción pendiente y error de síntesis, ejecutar igualmente
            if (pendingAction) {
                console.log("Error de síntesis pero hay acción pendiente, ejecutando:", pendingAction);
                const actionToExecute = {...pendingAction};
                pendingAction = null;
                executeAction(actionToExecute);
            }
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
    function addMessage(text, sender, forceSpeech = false) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender);
        
        const messageContent = document.createElement('div');
        messageContent.classList.add('message-content');
        messageContent.textContent = text;
        
        messageDiv.appendChild(messageContent);
        chatBody.appendChild(messageDiv);
        
        // Scroll al final
        chatBody.scrollTop = chatBody.scrollHeight;
        
        // Si es mensaje del asistente y está habilitada la síntesis de voz O se fuerza síntesis
        if (sender === 'assistant' && (isSpeakingEnabled || forceSpeech) && text) {
            console.log("Hablando mensaje:", text);
            speakText(text);
        }
    }
    
    // Función para abrir/cerrar el panel de chat
    assistantBtn.addEventListener('click', function() {
        chatPanel.style.display = chatPanel.style.display === 'none' || chatPanel.style.display === '' ? 'flex' : 'none';
    });
    
    // Cerrar chat al hacer clic en el botón de cerrar
    closeChatBtn.addEventListener('click', function() {
        // Primero establecemos una bandera para indicar que la cancelación es intencional
        const intentionalClose = true;
        
        // Detener cualquier síntesis en curso al cerrar el chat
        if (window.speechSynthesis.speaking) {
            // Cancelar la síntesis actual
            window.speechSynthesis.cancel();
            currentUtterance = null;
        }
        
        // Finalmente ocultar el panel
        chatPanel.style.display = 'none';
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
            
            // Añadir logs para depuración
            const data = await response.json();
            console.log("Respuesta del servidor:", data);
            
            // Comprobar si la respuesta incluye una acción
            if (data.action) {
                console.log("⚡ Acción detectada:", data.action);
                
                pendingAction = {
                    action: data.action,
                    target: data.target || null
                };
                
                // Agregar el mensaje de respuesta
                addMessage(data.response, 'assistant');
                
                // Si la síntesis de voz está desactivada, ejecutar la acción inmediatamente
                if (!isSpeakingEnabled) {
                    console.log("Síntesis desactivada, ejecutando acción inmediatamente");
                    setTimeout(() => {
                        executeAction(pendingAction);
                        pendingAction = null;
                    }, 1000);
                }
                // Si la síntesis está activada, la acción se ejecutará cuando termine de hablar
                // vía el evento onend en la función speakText
            } else {
                // Respuesta normal sin acción
                console.log("Respuesta normal sin acción");
                pendingAction = null;
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
    
    // Función para comenzar a escuchar (modificada para sincronizar con el botón flotante)
    function startListening() {
        if (!('webkitSpeechRecognition' in window)) {
            addMessage('Lo siento, tu navegador no soporta reconocimiento de voz.', 'assistant');
            return;
        }
        
        // Si ya está escuchando, no hacer nada
        if (isListening) return;
        
        isListening = true;
        voiceToggleBtn.innerHTML = '<i class="fas fa-stop"></i>';
        assistantBtn.classList.add('active');
        
        // Sincronizar con el botón flotante
        const floatingBtn = document.getElementById('voiceAssistantBtn');
        if (floatingBtn) {
            floatingBtn.classList.add('listening');
        }
        
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
            // No mostrar mensaje de error en caso de "no-speech" para no interrumpir la conversación
            if (event.error !== 'no-speech') {
                addMessage('Lo siento, hubo un error al reconocer tu voz.', 'assistant');
            }
        };
        
        // CAMBIO: Cuando termina sin resultados, volver a activar
        recognition.onend = function() {
            // Si isListening sigue activo (no ha sido detenido por onresult), entonces hubo un timeout
            if (isListening) {
                stopListening();
            }
        };
        
        recognition.start();
    }
    
    // Función para dejar de escuchar (modificada para sincronizar con el botón flotante)
    function stopListening() {
        isListening = false;
        voiceToggleBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        assistantBtn.classList.remove('active');
        
        // Sincronizar con el botón flotante
        const floatingBtn = document.getElementById('voiceAssistantBtn');
        if (floatingBtn) {
            floatingBtn.classList.remove('listening');
            floatingBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        }
        
        // Remover indicador de escucha
        const listeningIndicator = document.getElementById('listeningIndicator');
        if (listeningIndicator) {
            listeningIndicator.remove();
        }
    }
    
    // Función para actualizar el estado visual del botón de síntesis de voz
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
            addMessage(message, 'assistant', false); // No activar síntesis para este mensaje
        });
    }

    // Cargar preferencia guardada de síntesis de voz
    const savedSpeechPref = localStorage.getItem('speechEnabled');
    if (savedSpeechPref !== null) {
        isSpeakingEnabled = savedSpeechPref === 'true';
    }

    // Actualizar estado de los botones al iniciar
    if (speakToggleBtn) {
        updateSpeakButtonUI();
    }
    
    if (autoConversationBtn) {
        updateAutoConversationButtonUI();
    }

    // Verificar si el usuario está logueado y activar autoconversación
    function checkUserAndActivateAuto() {
        if (localStorage.getItem('token')) {
            console.log("Usuario detectado, verificando conversación automática");
            
            // Si hay token pero no hay preferencia guardada, activar por defecto
            if (localStorage.getItem('autoConversationEnabled') === null) {
                isAutoConversationEnabled = true;
                localStorage.setItem('autoConversationEnabled', 'true');
                console.log("Modo conversación activado por defecto");
            }
            
            // Si hay token pero no hay preferencia de voz, activar por defecto
            if (localStorage.getItem('speechEnabled') === null) {
                isSpeakingEnabled = true;
                localStorage.setItem('speechEnabled', 'true');
                console.log("Síntesis de voz activada por defecto");
            }
            
            // Actualizar UI
            updateAutoConversationButtonUI();
            updateSpeakButtonUI();
        }
    }

    // Llamar esta función al cargar
    checkUserAndActivateAuto();

    // Añadir esta nueva función para centralizar la ejecución de acciones

    function executeAction(actionData) {
        if (!actionData) return;
        
        console.log("Ejecutando acción:", actionData);
        
        // Detener cualquier síntesis de voz en curso y reconocimiento
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            currentUtterance = null;
        }
        
        if (isListening) {
            stopListening();
        }
        
        // Ejecutar la acción después de un pequeño retraso
        setTimeout(() => {
            if (actionData.action === 'logout') {
                console.log("Ejecutando cierre de sesión...");
                
                if (typeof window.cerrarSesion === 'function') {
                    window.cerrarSesion(); // Usar la función global
                } else {
                    // Implementación de respaldo por si no encuentra la función
                    console.log("Función window.cerrarSesion no encontrada, usando implementación de respaldo");
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    alert("Has cerrado sesión correctamente");
                    window.location.href = 'login.html';
                }
            } 
            else if (actionData.action === 'navigate_to') {
                // Navegar a páginas específicas del sistema
                switch(actionData.target) {
                    case 'profile':
                        window.location.href = 'profile.html';
                        break;
                    case 'orders':
                        window.location.href = 'mis-compras.html';
                        break;
                    default:
                        addMessage('No pude encontrar esa página.', 'assistant');
                        pendingAction = null; // Limpiar la acción pendiente
                }
            }
            // AÑADIR ESTE BLOQUE para manejar navegación a categorías
            else if (actionData.action === 'navigate') {
                console.log("Navegando a categoría:", actionData.target);
                
                // Cargar el archivo JSON de categorías y buscar la URL correcta
                fetch('/JSONcategorias/categoriasInterfaz.json')
                    .then(response => response.json())
                    .then(data => {
                        const categorias = data.categorias;
                        const categoriaEncontrada = categorias.find(
                            cat => cat.id === actionData.target
                        );
                        
                        if (categoriaEncontrada) {
                            console.log("Categoría encontrada, redirigiendo a:", categoriaEncontrada.url);
                            window.location.href = categoriaEncontrada.url;
                        } else {
                            console.log("Categoría no encontrada, usando URL por defecto");
                            // URL por defecto como respaldo
                            window.location.href = `Categorias/categorias.html?categoria=${actionData.target}`;
                        }
                    })
                    .catch(error => {
                        console.error("Error cargando JSON de categorías:", error);
                        // URL por defecto en caso de error
                        window.location.href = `Categorias/categorias.html?categoria=${actionData.target}`;
                    });
            } 
            else {
                console.error("Acción no reconocida:", actionData);
                pendingAction = null; // Limpiar la acción pendiente
            }
        }, 100);
    }
    
    // Manejador global para problemas con SpeechSynthesis
    if (window.speechSynthesis) {
        // Asegurarnos de que la síntesis se resetea si la página se oculta/muestra
        document.addEventListener('visibilitychange', function() {
            if (document.visibilityState === 'visible') {
                window.speechSynthesis.cancel();
                currentUtterance = null;
            }
        });
        
        // Verificar periódicamente si hay síntesis atascada
        setInterval(() => {
            if (window.speechSynthesis.speaking && currentUtterance) {
                const now = new Date().getTime();
                const utteranceStartTime = currentUtterance.startTime || now;
                
                // Aumentar el límite a 20 segundos para textos más largos
                if (now - utteranceStartTime > 20000) {
                    console.log("Posible síntesis atascada, reseteando");
                    window.speechSynthesis.cancel();
                    currentUtterance = null;
                    
                    // Si había una acción pendiente, ejecutarla
                    if (pendingAction) {
                        console.log("Ejecutando acción pendiente después de reset:", pendingAction);
                        const actionToExecute = {...pendingAction};
                        pendingAction = null;
                        executeAction(actionToExecute);
                    }
                }
            }
        }, 5000);
    }

    // Guardar el tiempo de inicio al empezar a hablar
    const originalSpeak = window.speechSynthesis.speak;
    window.speechSynthesis.speak = function(utterance) {
        utterance.startTime = new Date().getTime();
        return originalSpeak.call(window.speechSynthesis, utterance);
    };
});

// Código para tu página index.html que detecte la categoría en la URL
document.addEventListener('DOMContentLoaded', function() {
    const params = new URLSearchParams(window.location.search);
    const categoria = params.get('categoria');
    
    if (categoria) {
        console.log("Mostrando categoría:", categoria);
        // Aquí tu código para filtrar y mostrar productos de esa categoría
    }
});