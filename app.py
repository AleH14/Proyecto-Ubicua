from flask import Flask, request, jsonify, session
from flask_cors import CORS
import subprocess
import os
import bcrypt
import jwt
import datetime
from pymongo import MongoClient
from bson.objectid import ObjectId 
from ModelAI.testAI import get_ai_response
# Importar el módulo de reconocimiento de voz
from SpeechRecognition.TestSpeechRecognition import record_and_transcribe_audio

app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:5500", "http://127.0.0.1:5500"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})  # Habilita CORS para todas las rutas

# Configuración MongoDB
try:
    # Conectar a MongoDB - actualiza la URL si usas Atlas o un host diferente
    client = MongoClient('mongodb://localhost:27017/')
    db = client['fooddelivery']
    users_collection = db['users']
    orders_collection = db['orders']
    conversations_collection = db['conversations']
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

def save_conversation(user_id, conversation_history):
    """
    Guarda la conversación de un usuario en la base de datos
    """
    conversations_collection.update_one(
        {'user_id': user_id},
        {'$set': {
            'history': conversation_history, 
            'updated_at': datetime.datetime.utcnow()
        }},
        upsert=True
    )

def get_conversation(user_id):
    """
    Recupera el historial de conversación de un usuario
    """
    conversation_doc = conversations_collection.find_one({'user_id': user_id})
    return conversation_doc['history'] if conversation_doc else []

@app.route('/chat', methods=['POST'])
@token_required
def chat(current_user):
    try:
        data = request.get_json()
        user_message = data.get('message', '')
        
        if not user_message:
            return jsonify({"error": "El mensaje está vacío"}), 400
        
        user_id = str(current_user['_id'])
        
        # Obtener el historial de pedidos del usuario
        user_orders = list(orders_collection.find({'userId': user_id}).sort('date', -1).limit(10))
        
        # Convertir ObjectId a string para la serialización
        for order in user_orders:
            order['_id'] = str(order['_id'])
            if 'date' in order:
                order['date'] = str(order['date'])
        
        # Recuperar el historial de conversación de MongoDB
        conversation_history = get_conversation(user_id)
        
        # Preparar datos adicionales del usuario (preferencias)
        user_data = {}
        if 'preferences_analysis' in current_user:
            user_data['preferences_analysis'] = current_user['preferences_analysis']
        
        # Utilizar la función importada de testAI.py con el contexto y el historial
        response = get_ai_response(user_message, user_orders, conversation_history, user_data)
        
        # Comprobar si la respuesta es un comando de acción
        if isinstance(response, dict) and 'action' in response:
            # Corregir clave inconsistente
            message = response.get("message", "")
            
            # Devolver la acción en el formato correcto
            return jsonify({
                "response": message,  # Asegurarse de que se usa la clave correcta
                "action": response["action"],
                "target": response.get("target", None)
            })
        else:
            # Si es una respuesta normal, continuar como antes
            # Actualizar el historial de conversación
            conversation_history.append({"role": "user", "content": user_message})
            conversation_history.append({"role": "assistant", "content": response})
            
            # Guardar conversación actualizada
            save_conversation(user_id, conversation_history)
            
            return jsonify({"response": response})
        
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

# Añade este endpoint al final del archivo, justo antes de if __name__ == '__main__':

@app.route('/api/auth/test', methods=['GET'])
@token_required
def test_auth(current_user):
    return jsonify({
        'success': True,
        'message': 'Autenticación válida',
        'user_id': str(current_user['_id']),
        'nombre': current_user['nombre']
    })

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

# Añadir después de las otras rutas de la API

@app.route('/api/conversations/clear', methods=['DELETE'])
@token_required
def clear_conversations(current_user):
    try:
        user_id = str(current_user['_id'])
        result = conversations_collection.delete_one({'user_id': user_id})
        
        if result.deleted_count > 0:
            return jsonify({
                'success': True,
                'message': 'Historial de conversaciones eliminado correctamente'
            })
        else:
            return jsonify({
                'success': True,
                'message': 'No se encontró historial de conversaciones para eliminar'
            })
    
    except Exception as e:
        print(f"Error al limpiar historial de conversaciones: {str(e)}")
        return jsonify({
            'success': False, 
            'error': f'Error al limpiar el historial de conversaciones: {str(e)}'
        }), 500

# Añadir después del endpoint para limpiar conversaciones

@app.route('/api/conversations/analyze-preferences', methods=['GET'])
@token_required
def analyze_preferences(current_user):
    try:
        user_id = str(current_user['_id'])
        
        # Recuperar el historial de conversación
        conversation_history = get_conversation(user_id)
        
        if not conversation_history or len(conversation_history) == 0:
            return jsonify({
                'success': False,
                'message': 'No hay suficiente historial de conversación para analizar'
            }), 400
        
        # Obtener el historial de pedidos del usuario para contexto adicional
        user_orders = list(orders_collection.find({'userId': user_id}).sort('date', -1))
        
        # Convertir ObjectId a string para la serialización
        for order in user_orders:
            order['_id'] = str(order['_id'])
            if 'date' in order:
                order['date'] = str(order['date'])
        
        # Crear un mensaje específico para analizar preferencias
        analyze_message = (
            "Basándote en todas nuestras conversaciones anteriores y mi historial de pedidos, "
            "identifica mis preferencias alimenticias. Haz una lista clara con guiones (-) de: "
            "1. Lo que me gusta comer, 2. Lo que no me gusta, 3. Cualquier restricción alimentaria que detectes. "
            "Sé específico y conciso. Si no tienes suficiente información para algún punto, indícalo."
        )
        
        # Llamar a la API de OpenAI para analizar preferencias
        preferences_analysis = get_ai_response(analyze_message, user_orders, conversation_history)
        
        # Guardar las preferencias en la colección de usuarios
        users_collection.update_one(
            {'_id': ObjectId(user_id)},
            {'$set': {
                'preferences_analysis': preferences_analysis,
                'preferences_updated_at': datetime.datetime.utcnow()
            }}
        )
        
        return jsonify({
            'success': True,
            'preferences': preferences_analysis
        })
        
    except Exception as e:
        print(f"Error al analizar preferencias: {str(e)}")
        return jsonify({
            'success': False, 
            'error': f'Error al analizar preferencias: {str(e)}'
        }), 500

# Añadir después del endpoint analyze_preferences

@app.route('/api/user/clear-preferences', methods=['DELETE'])
@token_required
def clear_user_preferences(current_user):
    try:
        user_id = str(current_user['_id'])
        
        # Actualizar el documento del usuario para eliminar las preferencias
        result = users_collection.update_one(
            {'_id': ObjectId(user_id)},
            {'$unset': {
                'preferences_analysis': "",
                'preferences_updated_at': ""
            }}
        )
        
        if result.modified_count > 0:
            return jsonify({
                'success': True,
                'message': 'Preferencias eliminadas correctamente'
            })
        else:
            return jsonify({
                'success': True,
                'message': 'No había preferencias para eliminar'
            })
    
    except Exception as e:
        print(f"Error al eliminar preferencias: {str(e)}")
        return jsonify({
            'success': False, 
            'error': f'Error al eliminar las preferencias: {str(e)}'
        }), 500

@app.route('/voice-recognition', methods=['POST'])
@token_required
def recognize_voice(current_user):
    try:
        print("Iniciando reconocimiento de voz...")
        
        # Ejecutar la función de grabación y reconocimiento de voz
        texto_reconocido = record_and_transcribe_audio()
        
        if not texto_reconocido:
            return jsonify({
                'success': False,
                'error': 'No se pudo reconocer ningún texto'
            }), 400
        
        print(f"Texto reconocido: {texto_reconocido}")
        
        # Devolver el texto reconocido
        return jsonify({
            'success': True,
            'text': texto_reconocido
        })
        
    except Exception as e:
        print(f"Error en reconocimiento de voz: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Error en reconocimiento de voz: {str(e)}'
        }), 500

if __name__ == '__main__':
    app.run(debug=True)