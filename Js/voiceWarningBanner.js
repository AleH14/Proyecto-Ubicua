document.addEventListener('DOMContentLoaded', function() {
    console.log("Verificando banner de advertencia de voz...");
    
    // Para depuración: mostrar el valor actual del localStorage
    console.log("Estado actual del banner:", localStorage.getItem('voiceWarningBannerDismissed'));
    
    // IMPORTANTE: Reiniciar el valor para pruebas (quitar esta línea en producción)
    // localStorage.removeItem('voiceWarningBannerDismissed');
    
    // Verificar si ya se ha mostrado y cerrado el banner anteriormente
    if (localStorage.getItem('voiceWarningBannerDismissed') === 'true') {
        console.log("Banner de voz ya mostrado anteriormente, no se volverá a mostrar");
        return; // No mostrar el banner si ya ha sido cerrado antes
    }
    
    console.log("Creando banner de advertencia de voz...");
    
    // Crear el banner de advertencia
    const banner = document.createElement('div');
    banner.id = 'voiceWarningBanner';
    banner.className = 'voice-warning-banner';
    
    banner.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center">
                <i class="fas fa-exclamation-triangle me-3 fs-4"></i>
                <span><strong>Atención:</strong> Al hacer clic en cualquier parte, el asistente de voz comenzará a escucharte.</span>
            </div>
            <button id="dismissWarningBtn" class="btn btn-sm btn-dark ms-3">
                Entendido, no mostrar de nuevo
            </button>
        </div>
    `;
    
    // Añadir estilos necesarios
    const style = document.createElement('style');
    style.textContent = `
        .voice-warning-banner {
            position: fixed;
            bottom: 20px;
            left: 20px;
            right: 20px;
            background-color: #ffc107;
            color: #212529;
            border-radius: 8px;
            text-align: center;
            padding: 15px;
            z-index: 9998;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transition: all 0.5s;
            animation: fadeIn 0.5s forwards;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeOut {
            from { opacity: 1; transform: translateY(0); }
            to { opacity: 0; transform: translateY(20px); }
        }
    `;
    
    document.head.appendChild(style);
    
    // Añadir el banner al final del documento
    document.body.appendChild(banner);
    console.log("Banner de advertencia de voz añadido al DOM");
    
    // Manejar el evento de cierre
    const dismissBtn = document.getElementById('dismissWarningBtn');
    if (dismissBtn) {
        dismissBtn.addEventListener('click', function(e) {
            console.log("Botón de cerrar banner pulsado");
            e.stopPropagation(); // Evitar que el clic se propague
            hideBanner();
        });
    } else {
        console.error("No se pudo encontrar el botón de cerrar banner");
    }
    
    // Función para ocultar el banner con animación
    function hideBanner() {
        const banner = document.getElementById('voiceWarningBanner');
        if (banner) {
            banner.style.animation = 'fadeOut 0.5s forwards';
            
            // Marcar como mostrado para que no vuelva a aparecer
            try {
                localStorage.setItem('voiceWarningBannerDismissed', 'true');
                console.log("Banner marcado como cerrado en localStorage");
            } catch (e) {
                console.error("Error al guardar en localStorage:", e);
            }
            
            // Eliminar el banner después de la animación
            setTimeout(() => {
                if (banner && banner.parentNode) {
                    banner.parentNode.removeChild(banner);
                    console.log("Banner eliminado del DOM");
                }
            }, 500);
        } else {
            console.error("No se pudo encontrar el banner para ocultar");
        }
    }
    
    // Verificación adicional para asegurarse de que se cargue correctamente
    setTimeout(() => {
        if (!document.getElementById('voiceWarningBanner')) {
            console.error("El banner no se agregó correctamente al DOM");
        }
    }, 100);
});

// Garantizar que el script se ejecuta después de que el DOM esté completamente cargado
window.addEventListener('load', function() {
    console.log("Página completamente cargada, verificando banner de advertencia");
    if (!document.getElementById('voiceWarningBanner') && 
        localStorage.getItem('voiceWarningBannerDismissed') !== 'true') {
        console.log("Forzando creación del banner tras carga completa");
        // El evento DOMContentLoaded podría haber fallado, intentamos nuevamente
        const event = new Event('DOMContentLoaded');
        document.dispatchEvent(event);
    }
});