from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import os
import bcrypt
import jwt
import datetime
from pymongo import MongoClient
from bson.objectid import ObjectId  # Importa esto
# Importar el módulo testAI
from ModelAI.testAI import get_ai_response

app = Flask(__name__)
CORS(app)  # Habilita CORS para todas las rutas

# Configuración MongoDB
try:
    # Conectar a MongoDB - actualiza la URL si usas Atlas o un host diferente
    client = MongoClient('mongodb://localhost:27017/')
    db = client['fooddelivery']
    users_collection = db['users']
    orders_collection = db['orders']
    print("✅ Colecciones disponibles:", db.list_collection_names())
    print("✅ Conexión a MongoDB establecida")
except Exception as e:
    print(f"❌ Error conectando a MongoDB: {e}")

# Clave secreta para JWT
SECRET_KEY = 'tu_clave_secreta_cambiar_en_produccion'

# Función para generar tokens JWT
def generate_token(user_id):
    payload = {
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=1),
        'iat': datetime.datetime.utcnow(),
        'sub': str(user_id)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')

# Middleware para proteger rutas
def token_required(f):
    def decorated(*args, **kwargs):
        token = None
        
        # Verificar si hay token en el header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'message': 'Token inválido'}), 401

        if not token:
            return jsonify({'message': 'Token no proporcionado'}), 401

        try:
            # Decodificar token
            data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            current_user = users_collection.find_one({'_id': ObjectId(data['sub'])})
            
            if not current_user:
                return jsonify({'message': 'Usuario no encontrado'}), 401
                
        except Exception as e:
            return jsonify({'message': f'Token inválido: {str(e)}'}), 401
            
        return f(current_user, *args, **kwargs)
    
    # Renombrar la función para que Flask la reconozca correctamente
    decorated.__name__ = f.__name__
    return decorated

# Ruta para el registro de usuarios
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    
    # Validar datos requeridos
    required_fields = ['nombre', 'apellidos', 'email', 'password']
    for field in required_fields:
        if field not in data:
            return jsonify({'success': False, 'error': f'Falta el campo {field}'}), 400
    
    # Verificar si el usuario ya existe
    if users_collection.find_one({'email': data['email']}):
        return jsonify({'success': False, 'error': 'El correo electrónico ya está registrado'}), 400
    
    # Hash de la contraseña
    hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())
    
    # Crear nuevo usuario
    new_user = {
        'nombre': data['nombre'],
        'apellidos': data['apellidos'],
        'email': data['email'],
        'telefono': data.get('telefono', ''),
        'password': hashed_password,
        'fecha_registro': datetime.datetime.utcnow()
    }
    
    # Insertar en la base de datos
    try:
        result = users_collection.insert_one(new_user)
        user_id = str(result.inserted_id)
        
        # Generar token JWT
        token = generate_token(user_id)
        
        # Devolver respuesta con token y datos del usuario (sin password)
        user_data = {
            'id': user_id,
            'nombre': new_user['nombre'],
            'apellidos': new_user['apellidos'],
            'email': new_user['email']
        }
        
        return jsonify({
            'success': True,
            'token': token,
            'user': user_data
        }), 201
        
    except Exception as e:
        return jsonify({'success': False, 'error': f'Error al registrar usuario: {str(e)}'}), 500

# Ruta para el inicio de sesión
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    
    # Validar datos requeridos
    if 'email' not in data or 'password' not in data:
        return jsonify({'success': False, 'error': 'Se requiere email y password'}), 400
    
    # Buscar usuario por email
    user = users_collection.find_one({'email': data['email']})
    
    # Verificar si el usuario existe y la contraseña es correcta
    if user and bcrypt.checkpw(data['password'].encode('utf-8'), user['password']):
        # Generar token JWT
        token = generate_token(str(user['_id']))
        
        # Devolver respuesta con token y datos del usuario (sin password)
        user_data = {
            'id': str(user['_id']),
            'nombre': user['nombre'],
            'apellidos': user['apellidos'],
            'email': user['email']
        }
        
        return jsonify({
            'success': True,
            'token': token,
            'user': user_data
        })
    else:
        return jsonify({'success': False, 'error': 'Credenciales inválidas'}), 401

# Ruta para obtener perfil del usuario
@app.route('/api/auth/profile', methods=['GET'])
@token_required
def get_profile(current_user):
    # El usuario ya está disponible desde el decorador token_required
    user_data = {
        'id': str(current_user['_id']),
        'nombre': current_user['nombre'],
        'apellidos': current_user['apellidos'],
        'email': current_user['email'],
        'telefono': current_user.get('telefono', '')
    }
    
    return jsonify({
        'success': True,
        'user': user_data
    })

@app.route('/chat', methods=['POST'])
def chat():
    try:
        # Obtén el mensaje del cuerpo de la solicitud
        data = request.get_json()
        user_message = data.get('message', '')
        
        if not user_message:
            return jsonify({"error": "El mensaje está vacío"}), 400
        
        # Utilizar la función importada de testAI.py
        response_text = get_ai_response(user_message)
        
        return jsonify({"response": response_text})
    
    except Exception as e:
        print(f"Error en /chat: {str(e)}")
        return jsonify({"error": f"Error al procesar la solicitud: {str(e)}"}), 500

# Mantén tu endpoint original
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

# Añade esto en app.py junto a las demás rutas
@app.route('/api/orders/create', methods=['POST'])
@token_required
def create_order(current_user):
    data = request.get_json()
    
    # Validar datos requeridos
    required_fields = ['productId', 'productName', 'price', 'quantity']
    for field in required_fields:
        if field not in data:
            return jsonify({'success': False, 'error': f'Falta el campo {field}'}), 400
    
    # Crear la orden con la información del producto y el usuario
    new_order = {
        'userId': str(current_user['_id']),
        'productId': data['productId'],
        'productName': data['productName'],
        'price': data['price'],
        'quantity': data.get('quantity', 1),
        'total': float(data['price'].replace('€', '').strip()) * data.get('quantity', 1),
        'date': datetime.datetime.utcnow(),
        'status': 'pending'  # puede ser: pending, completed, cancelled
    }
    
    # Si hay más detalles del producto, los añadimos
    if 'productImage' in data:
        new_order['productImage'] = data['productImage']
    if 'categoria' in data:
        new_order['categoria'] = data['categoria']
    
    try:
        # Insertar en la colección de órdenes
        orders_collection = db['orders']
        result = orders_collection.insert_one(new_order)
        
        return jsonify({
            'success': True,
            'message': 'Orden creada con éxito',
            'orderId': str(result.inserted_id)
        }), 201
        
    except Exception as e:
        return jsonify({'success': False, 'error': f'Error al crear la orden: {str(e)}'}), 500

# Endpoint para obtener todas las órdenes de un usuario
@app.route('/api/orders/user', methods=['GET'])
@token_required
def get_user_orders(current_user):
    try:
        # Obtener las órdenes del usuario actual
        orders_collection = db['orders']
        orders = list(orders_collection.find({'userId': str(current_user['_id'])}))
        
        # Convertir ObjectId a string para la serialización JSON
        for order in orders:
            order['_id'] = str(order['_id'])
        
        return jsonify({
            'success': True,
            'orders': orders
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': f'Error al obtener las órdenes: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True)