from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess

app = Flask(__name__)
CORS(app)  # Habilita CORS para todas las rutas

@app.route('/run-script', methods=['POST'])
def run_script():
    try:
        # Obtén el modelo del cuerpo de la solicitud
        data = request.get_json()
        modelo = data.get('modelo', 'Lays bag.glb')  # Modelo por defecto si no se envía

        # Ejecuta el script con el modelo como argumento
        result = subprocess.run(['python', 'ejecutarModelo.py', modelo], capture_output=True, text=True)
        if result.returncode == 0:
            return jsonify({"message": "¡Script ejecutado con éxito!", "output": result.stdout})
        else:
            return jsonify({"message": "Error al ejecutar el script", "error": result.stderr}), 500
    except Exception as e:
        return jsonify({"message": "Error interno del servidor", "error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)