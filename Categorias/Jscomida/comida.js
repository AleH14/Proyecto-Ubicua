// Datos de las hamburguesas
//document.getElementById('run-script-1').addEventListener('click', () => ejecutarModelo('modelos3D/Cheeseburger.glb'));
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

// Variable para almacenar los datos cargados desde el JSON
let hamburgersData = [];

// Función para cargar los datos desde el archivo JSON
async function cargarDatosHamburguesas() {
    try {
        const response = await fetch('./JSON/hamburguesas.json');
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        hamburgersData = await response.json();
        console.log('Datos cargados correctamente:', hamburgersData);
        inicializarTarjetas();
    } catch (error) {
        console.error('Error al cargar el archivo JSON:', error);
        document.getElementById('response').innerText = 'Error al cargar los datos de las hamburguesas.';
    }
}

// Función para inicializar las tarjetas una vez que tenemos los datos
function inicializarTarjetas() {
    // Obtener referencias a los elementos de las hamburguesas
    const hamburgerCards = document.querySelectorAll('.category-card');
    
    // Añadir evento de clic a cada tarjeta
    hamburgerCards.forEach((card, index) => {
        card.addEventListener('click', function() {
            showHamburgerDetail(index);
        });
        // Hacer que las tarjetas parezcan clickeables
        card.style.cursor = 'pointer';
    });
}

function showHamburgerDetail(index) {
    const burger = hamburgersData[index];
    
    // Actualizar el contenido del modal con los datos de la hamburguesa seleccionada
    document.getElementById('hamburger-img').src = burger.image;
    document.getElementById('hamburger-name').textContent = burger.name;
    document.getElementById('hamburger-description').textContent = burger.description;
    document.getElementById('hamburger-rating').textContent = burger.rating;
    document.getElementById('hamburger-price').textContent = burger.price;
    
    // Actualizar el botón de Ver en 3D para que use la ruta correcta
    const btn3D = document.querySelector('#hamburgerDetailModal .btn-outline-primary');
    btn3D.onclick = function() {
        ejecutarModelo(burger.ruta);
    };
    
    // Mostrar el modal
    const modal = new bootstrap.Modal(document.getElementById('hamburgerDetailModal'));
    modal.show();
}

// Cargar los datos cuando se carga el DOM
document.addEventListener('DOMContentLoaded', function() {
    cargarDatosHamburguesas();
});