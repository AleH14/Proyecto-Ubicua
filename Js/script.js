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
    
    // Función para abrir/cerrar el panel de chat
    assistantBtn.addEventListener('click', function() {
        chatPanel.style.display = chatPanel.style.display === 'none' || chatPanel.style.display === '' ? 'flex' : 'none';
    });
    
    // Cerrar chat al hacer clic en el botón de cerrar
    closeChatBtn.addEventListener('click', function() {
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
        
        // Limpiar input
        chatInput.value = '';
        
        // Mostrar indicador de carga
        const loadingId = showLoading();
        
        try {
            // Enviar el mensaje a nuestro servidor Flask
            const response = await fetch('http://localhost:5000/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: message })
            });
            
            // Remover indicador de carga
            removeLoading(loadingId);
            
            if (!response.ok) {
                throw new Error('Error en la comunicación con el servidor');
            }
            
            const data = await response.json();
            
            if (data.error) {
                addMessage('Lo siento, ha ocurrido un error. Por favor, inténtalo de nuevo.', 'assistant');
                console.error(data.error);
            } else {
                // Agregar respuesta del asistente
                addMessage(data.response, 'assistant');
            }
        } catch (error) {
            // Remover indicador de carga si ocurre un error
            removeLoading(loadingId);
            
            console.error('Error:', error);
            addMessage('Lo siento, ha ocurrido un error de conexión. Por favor, inténtalo más tarde.', 'assistant');
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
    
    // Función para agregar mensaje al chat
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
        
        // Eliminar indicador de escucha
        const listeningIndicator = document.getElementById('listeningIndicator');
        if (listeningIndicator) {
            listeningIndicator.remove();
        }
    }
});


