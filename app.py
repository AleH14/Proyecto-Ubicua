from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import os

app = Flask(__name__)
CORS(app)  # Habilita CORS para todas las rutas

@app.route('/run-script', methods=['POST'])
def run_script():
    try:
        # Obtén el modelo del cuerpo de la solicitud
        data = request.get_json()
        modelo_relativo = data.get('modelo', 'Lays bag.glb')  # Modelo por defecto si no se envía

        # Construir ruta absoluta al script y al modelo
        current_dir = os.path.dirname(os.path.abspath(__file__))
        script_path = os.path.join(current_dir, 'ejecutarModelo.py')
        modelo_path = os.path.join(current_dir, modelo_relativo)
        
        # Verificar que el modelo existe
        if not os.path.exists(modelo_path):
            return jsonify({
                "message": "Error: Archivo de modelo no encontrado", 
                "error": f"No se encontró el archivo: {modelo_path}"
            }), 404
        
        # Imprimir información para depuración
        print(f"Directorio actual: {current_dir}")
        print(f"Ruta del script: {script_path}")
        print(f"Modelo a cargar: {modelo_path}")
        
        # Ejecuta el script con el modelo como argumento (usar ruta absoluta)
        result = subprocess.run(['python', script_path, modelo_path], capture_output=True, text=True)
        if result.returncode == 0:
            return jsonify({"message": "¡Script ejecutado con éxito!", "output": result.stdout})
        else:
            return jsonify({"message": "Error al ejecutar el script", "error": result.stderr}), 500
    except Exception as e:
        return jsonify({"message": "Error interno del servidor", "error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)