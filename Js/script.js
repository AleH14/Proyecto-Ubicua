/*document.getElementById('run-script-1').addEventListener('click', () => ejecutarModelo('modelos3D/Cheeseburger.glb'));
//document.getElementById('run-script-2').addEventListener('click', () => ejecutarModelo('modelos3D/Cheeseburger.glb'));
//document.getElementById('run-script-3').addEventListener('click', () => ejecutarModelo('modelos3D/4_13_2025.glb'));
//document.getElementById('run-script-4').addEventListener('click', () => ejecutarModelo('modelos3D/Chocolate.glb'));
//document.getElementById('run-script-5').addEventListener('click', () => ejecutarModelo('modelos3D/Comically.glb'));
//document.getElementById('run-script-6').addEventListener('click', () => ejecutarModelo('modelos3D/Homemade.glb'));
//document.getElementById('run-script-7').addEventListener('click', () => ejecutarModelo('modelos3D/KFC,burger.glb'));
//document.getElementById('run-script-8').addEventListener('click', () => ejecutarModelo('modelos3D/PizzaPeperoni.glb'));
//document.getElementById('run-script-9').addEventListener('click', () => ejecutarModelo('modelos3D/apple.glb'));

async function ejecutarModelo(modelo) {
    try {
        const response = await fetch('http://127.0.0.1:5000/run-script', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ modelo }) // Enviar el modelo al servidor
        });
        const data = await response.json();
        document.getElementById('response').innerText = data.output || data.message;
    } catch (error) {
        console.error('Error en la solicitud:', error);
        document.getElementById('response').innerText = 'Error al comunicarse con el servidor.';
    }
}
    */

/*
esto es para el boton de asistente de voz
document.addEventListener('DOMContentLoaded', function() {
    const voiceBtn = document.getElementById('voiceAssistantBtn');
    
    voiceBtn.addEventListener('click', function() {
        this.classList.toggle('active');
        // Aquí iría la funcionalidad para capturar la voz
        alert('Funcionalidad de asistente por voz (en desarrollo)');
        setTimeout(() => {
            this.classList.remove('active');
        }, 2000);
    });
});*/

