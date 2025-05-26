document.addEventListener('DOMContentLoaded', function() {
    // Determinar en qué página estamos
    const currentPage = window.location.pathname.split('/').pop();
    const isMainPage = currentPage === 'interfaz.html' || currentPage === '' || currentPage === '/';
    console.log("Página actual:", currentPage, "¿Es página principal?:", isMainPage);
    
    // Cargar el componente de chat
    function loadChatComponent() {
        // Usar ruta relativa en lugar de absoluta para los recursos
        fetch('components/chat-component.html')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Error cargando componente: ${response.status}`);
                }
                return response.text();
            })
            .then(html => {
                // Crear un contenedor para el chat
                const chatContainer = document.createElement('div');
                chatContainer.innerHTML = html;
                document.body.appendChild(chatContainer);
                
                // Cargar los estilos si no están ya cargados - usar ruta relativa
                if (!document.querySelector('link[href="Css/chat-styles.css"]')) {
                    const styleLink = document.createElement('link');
                    styleLink.rel = 'stylesheet';
                    styleLink.href = 'Css/chat-styles.css';
                    document.head.appendChild(styleLink);
                }
                
                // Configurar variables globales antes de cargar el script
                window.isMainPage = isMainPage;
                
                // Inicializar el chat después de cargarlo
                initializeChat();
            })
            .catch(error => {
                console.error('Error cargando el componente de chat:', error);
            });
    }
    
    // Inicializar el chat después de cargar el componente
    function initializeChat() {
        // Cargar el script principal del chat
        const scriptElement = document.createElement('script');
        scriptElement.src = 'Js/script.js';
        scriptElement.onload = function() {
            console.log('Script del chat cargado correctamente');
            
            // Inicializar manualmente si es necesario
            if (window.initChatAssistant) {
                window.initChatAssistant(isMainPage);
            }
        };
        document.body.appendChild(scriptElement);
        
        // También podemos cargar el script de asistente de voz si es necesario
        if (!document.querySelector('script[src="Js/voiceAssistant.js"]')) {
            const voiceScript = document.createElement('script');
            voiceScript.src = 'Js/voiceAssistant.js';
            document.body.appendChild(voiceScript);
        }
    }
    
    // Ejecutar la carga
    loadChatComponent();
    
    // Después de la carga del componente, añadir un listener específico para el micrófono
    function setupMicrophoneListener() {
        const voiceToggleBtn = document.getElementById('voiceToggleBtn');
        const voiceAssistantBtn = document.getElementById('voiceAssistantBtn');
        
        if (voiceToggleBtn) {
            voiceToggleBtn.addEventListener('click', function() {
                // Desactivar modo conversación automática si está activo
                if (window.isAutoConversationEnabled) {
                    window.isAutoConversationEnabled = false;
                    localStorage.setItem('autoConversationEnabled', 'false');
                    if (window.updateAutoConversationButtonUI) {
                        window.updateAutoConversationButtonUI();
                    }
                    console.log("Modo conversación automática desactivado al usar el micrófono");
                }
            });
        }
        
        if (voiceAssistantBtn) {
            voiceAssistantBtn.addEventListener('click', function() {
                // Desactivar modo conversación automática si está activo
                if (window.isAutoConversationEnabled) {
                    window.isAutoConversationEnabled = false;
                    localStorage.setItem('autoConversationEnabled', 'false');
                    if (window.updateAutoConversationButtonUI) {
                        window.updateAutoConversationButtonUI();
                    }
                    console.log("Modo conversación automática desactivado al usar el micrófono flotante");
                }
            });
        }
    }
    
    // Ejecutar después de un tiempo para asegurarse de que los elementos ya están cargados
    setTimeout(setupMicrophoneListener, 1000);
});