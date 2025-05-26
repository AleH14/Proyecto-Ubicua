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
import base64
import tempfile
from FaceRecognition.faceRecognition import obtener_token
# Importar el módulo faceAnalizer con las funciones necesarias
from FaceRecognition.faceAnalizer import verify_face, get_face_embedding
import cv2  # Importar OpenCV
from ModeloIAGemini.TestIAGemini import generar_respuesta_texto

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
    
    print(f"Datos recibidos para registro: {data.keys()}")
    
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
    
    # Añadir el token facial si está presente
    if 'faceToken' in data and data['faceToken']:
        print(f"Token facial recibido para usuario {data['email']}")
        new_user['faceToken'] = data['faceToken']
    else:
        print(f"No se recibió token facial para usuario {data['email']}")
    
    # Insertar en la base de datos
    try:
        result = users_collection.insert_one(new_user)
        user_id = str(result.inserted_id)
        
        print(f"Usuario registrado con ID: {user_id}, Campos: {new_user.keys()}")
        
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
        print(f"Error al registrar usuario: {str(e)}")
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
            
            # AÑADIR AQUÍ: Actualizar el historial de conversación también para acciones
            conversation_history.append({"role": "user", "content": user_message})
            conversation_history.append({"role": "assistant", "content": message})
            
            # AÑADIR AQUÍ: Guardar conversación actualizada
            save_conversation(user_id, conversation_history)
            
            # Devolver la acción en el formato correcto
            return jsonify({
                "response": message,
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
        preferences_analysis = get_ai_response(analyze_message, user_orders, conversation_history, skip_command_detection=True)
        
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

@app.route('/api/face/process', methods=['POST'])
def process_face_image():
    try:
        data = request.get_json()
        
        if 'image' not in data:
            return jsonify({
                'success': False,
                'error': 'No se proporcionó ninguna imagen'
            }), 400
            
        # Obtener la imagen en base64 y eliminar el prefijo (ej: data:image/jpeg;base64,)
        base64_data = data['image']
        if ',' in base64_data:
            base64_data = base64_data.split(',', 1)[1]
            
        # Decodificar la imagen
        image_data = base64.b64decode(base64_data)
        
        # Guardar temporalmente la imagen
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_file:
            temp_file_path = temp_file.name
            temp_file.write(image_data)
        
        try:
            # Procesar la imagen con faceRecognition
            face_token = obtener_token(temp_file_path)
            
            if face_token is None:
                return jsonify({
                    'success': False,
                    'error': 'No se pudo detectar un rostro claro en la imagen'
                }), 400
                
            # Devolver el token facial
            return jsonify({
                'success': True,
                'faceToken': face_token
            })
            
        finally:
            # Limpiar el archivo temporal
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
                
    except Exception as e:
        print(f"Error al procesar imagen facial: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Error al procesar la imagen: {str(e)}'
        }), 500

# Añadir este nuevo endpoint después de login
@app.route('/api/auth/face-login', methods=['POST'])
def face_login():
    try:
        data = request.get_json()
        
        if 'image' not in data:
            return jsonify({
                'success': False,
                'error': 'No se proporcionó ninguna imagen'
            }), 400
            
        # Obtener la imagen en base64 y eliminar el prefijo
        base64_data = data['image']
        if ',' in base64_data:
            base64_data = base64_data.split(',', 1)[1]
            
        # Decodificar la imagen
        image_data = base64.b64decode(base64_data)
        
        # Guardar temporalmente la imagen
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_file:
            temp_file_path = temp_file.name
            temp_file.write(image_data)
            
        try:
            # Verificar primero la cantidad de rostros
            img = cv2.imread(temp_file_path)
            detector = cv2.FaceDetectorYN.create(
                "FaceRecognition/dnns/face_detection_yunet_2023mar.onnx", 
                "", 
                (img.shape[1], img.shape[0])
            )
            
            # Realizar la detección
            _, faces = detector.detect(img)
            
            # Validar cantidad de rostros
            if faces is None or len(faces) == 0:
                return jsonify({
                    'success': False,
                    'error': 'No se detectaron rostros en la imagen'
                }), 400
                
            if len(faces) > 1:
                return jsonify({
                    'success': False,
                    'error': 'Se detectaron múltiples personas. Por favor, intenta con una sola persona en la cámara'
                }), 400
            
            # Buscar todos los usuarios que tengan token facial
            users_with_face = list(users_collection.find({'faceToken': {'$exists': True}}))
            
            if not users_with_face:
                print("No hay usuarios registrados con Face ID")
                return jsonify({
                    'success': False,
                    'error': 'No hay usuarios registrados con Face ID'
                }), 404
                
            print(f"Encontrados {len(users_with_face)} usuarios con token facial")
                
            # Procesar la imagen para verificar si hay rostros
            result = get_face_embedding(temp_file_path)
            
            if not result["success"]:
                return jsonify({
                    'success': False,
                    'error': result.get("error", "Error al procesar la imagen facial")
                }), 400
                
            # Para cada usuario, verificar si coincide con la imagen
            best_match = None
            best_similarity = 0
            threshold = 0.4  # Umbral para considerar coincidencia
            
            for user in users_with_face:
                # Verificar identidad usando faceAnalizer
                result = verify_face(temp_file_path, user['faceToken'], threshold)
                
                if "error" in result:
                    print(f"Error al verificar usuario {user['email']}: {result['error']}")
                    continue
                    
                similarity = result.get('similarity', 0)
                print(f"Usuario {user['email']} - Similitud: {similarity:.4f}")
                
                if result.get('match', False) and similarity > best_similarity:
                    best_match = user
                    best_similarity = similarity
            
            # Si encontramos una coincidencia
            if best_match:
                # Generar token JWT
                token = generate_token(str(best_match['_id']))
                
                # Datos del usuario para respuesta (sin contraseña ni token facial)
                user_data = {
                    'id': str(best_match['_id']),
                    'nombre': best_match['nombre'],
                    'apellidos': best_match['apellidos'],
                    'email': best_match['email'],
                    'similarity': best_similarity
                }
                
                print(f"¡Coincidencia! Usuario: {best_match['email']} - Similitud: {best_similarity:.4f}")
                
                return jsonify({
                    'success': True,
                    'token': token,
                    'user': user_data
                })
            else:
                print("No se encontraron coincidencias")
                return jsonify({
                    'success': False,
                    'error': 'No se pudo verificar la identidad'
                }), 401
                
        finally:
            # Limpiar archivo temporal
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
                
    except Exception as e:
        print(f"Error en autenticación facial: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Error en autenticación facial: {str(e)}'
        }), 500

# Si hubiera algún problema con la función verify_face, podríamos implementarla directamente
def verify_face_direct(image_path, encrypted_embedding_str, threshold=0.4):
    """Implementación directa por si hay problemas con el import"""
    from FaceRecognition.faceAnalizer import verify_face as original_verify_face
    return original_verify_face(image_path, encrypted_embedding_str, threshold)

# Añadir después de las otras rutas de la API

@app.route('/api/recommendations', methods=['GET'])
@token_required
def get_recommendations(current_user):
    try:
        # Importar módulos necesarios al inicio de la función
        import os
        import json
        
        user_id = str(current_user['_id'])
        
        # Definir current_dir para resolver la ruta correctamente
        current_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Obtener los pedidos del usuario
        user_orders = list(orders_collection.find({'userId': user_id}))
        
        # Si no hay pedidos, devolver categorías populares generales
        if not user_orders:
            return jsonify({
                'success': True,
                'recommendations': [],
                'hasOrders': False
            })
        
        # Analizar las categorías más frecuentes
        categories_count = {}
        for order in user_orders:
            category = order.get('categoria', 'sin-categoria')
            categories_count[category] = categories_count.get(category, 0) + 1
        
        # Ordenar las categorías por frecuencia
        sorted_categories = sorted(categories_count.items(), key=lambda x: x[1], reverse=True)
        top_categories = [cat[0] for cat in sorted_categories if cat[0] != 'sin-categoria'][:3]
        
        # Si no hay suficientes categorías, añadir algunas predeterminadas
        while len(top_categories) < 3:
            default_categories = ['pizza', 'hamburguesas', 'postres', 'bebidas', 'saludable']
            for cat in default_categories:
                if cat not in top_categories:
                    top_categories.append(cat)
                    if len(top_categories) >= 3:
                        break
        
        # Cargar datos de categorías desde el archivo JSON correcto
        json_path = os.path.join(current_dir, 'JSONcategorias', 'categoriasInterfaz.json')
        
        print(f"Intentando abrir: {json_path}")
        
        recommendations = []
        
        if os.path.exists(json_path):
            try:
                with open(json_path, 'r', encoding='utf-8') as file:
                    categorias_data = json.load(file)
                
                # Obtener todas las categorías disponibles
                all_categories = categorias_data.get('categorias', [])
                
                # Filtrar las categorías que coinciden con las top_categories
                for categoria in all_categories:
                    if categoria['id'] in top_categories:
                        recommendations.append({
                            'id': categoria.get('id', ''),
                            'nombre': categoria.get('nombre', ''),
                            'imagen': categoria.get('imagen', ''),
                            'categoria': categoria.get('id', ''),
                            'precio': 'Ver opciones'  # Texto genérico ya que no hay precio en categoriasInterfaz.json
                        })
                        
                        if len(recommendations) >= 6:  # Limitamos a 6 recomendaciones
                            break
            except Exception as e:
                print(f"Error al procesar el archivo JSON: {str(e)}")
        else:
            print(f"No se encontró el archivo en la ruta: {json_path}")
        
        return jsonify({
            'success': True,
            'recommendations': recommendations,
            'hasOrders': len(user_orders) > 0
        })
        
    except Exception as e:
        print(f"Error al obtener recomendaciones: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Error al obtener recomendaciones: {str(e)}'
        }), 500

# Añadir este nuevo endpoint después del endpoint /api/face/process

@app.route('/api/face/count', methods=['POST'])
def count_faces_in_image():
    try:
        data = request.get_json()
        
        if 'image' not in data:
            return jsonify({
                'success': False,
                'error': 'No se proporcionó ninguna imagen'
            }), 400
            
        # Obtener la imagen en base64 y eliminar el prefijo (ej: data:image/jpeg;base64,)
        base64_data = data['image']
        if ',' in base64_data:
            base64_data = base64_data.split(',', 1)[1]
            
        # Decodificar la imagen
        image_data = base64.b64decode(base64_data)
        
        # Guardar temporalmente la imagen
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_file:
            temp_file_path = temp_file.name
            temp_file.write(image_data)
        
        try:
            # Usar OpenCV para detectar rostros
            img = cv2.imread(temp_file_path)
            if img is None:
                return jsonify({
                    'success': False,
                    'error': 'No se pudo cargar la imagen'
                }), 400
                
            # Crear y configurar el detector de rostros
            detector = cv2.FaceDetectorYN.create(
                "FaceRecognition/dnns/face_detection_yunet_2023mar.onnx", 
                "", 
                (img.shape[1], img.shape[0])
            )
            
            # Realizar la detección
            _, faces = detector.detect(img)
            
            if faces is None:
                face_count = 0
                message = "No se detectaron rostros en la imagen"
            else:
                face_count = len(faces)
                
                if face_count == 0:
                    message = "No se detectaron rostros en la imagen"
                elif face_count == 1:
                    message = "Se detectó un rostro correctamente"
                else:
                    message = f"Se detectaron {face_count} rostros en la imagen"
                    
            return jsonify({
                'success': True,
                'faceCount': face_count,
                'message': message
            })
            
        finally:
            # Limpiar el archivo temporal
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
                
    except Exception as e:
        print(f"Error al contar rostros en la imagen: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Error al procesar la imagen: {str(e)}'
        }), 500

@app.route('/api/special-recommendations', methods=['GET'])
@token_required
def get_special_recommendations(current_user):
    try:
        # Verificar si el usuario tiene preferencias analizadas
        preferences = current_user.get('preferences_analysis')
        
        if not preferences:
            return jsonify({
                'success': False,
                'message': 'No hay preferencias disponibles para generar recomendaciones'
            }), 404
        
        # Obtener la hora actual para contextualizar las recomendaciones
        now = datetime.datetime.now()
        hour = now.hour
        
        if hour >= 5 and hour < 11:
            time_of_day = "desayuno"
        elif hour >= 11 and hour < 15:
            time_of_day = "almuerzo"
        elif hour >= 15 and hour < 19:
            time_of_day = "merienda"
        else:
            time_of_day = "cena"
        
        # Diccionario de imágenes por categoría
        image_dict = {
            "desayuno": "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=600",
            "almuerzo": "https://images.unsplash.com/photo-1547592180-85f173990554?w=600",
            "merienda": "https://images.unsplash.com/photo-1541599188778-cdc73298e8fd?w=600",
            "cena": "https://images.unsplash.com/photo-1574484284002-952d92456975?w=600",
            "postre": "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=600",
            "saludable": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600"
        }
        
        # Crear el prompt para Gemini
        prompt = f"""
        Basándote en estas preferencias del usuario:
        {preferences}
        
        Actualmente es hora de {time_of_day} ({hour}:00 horas).
        
        Sugiere 3 recetas caseras que:
        1. Se adapten a la hora del día ({time_of_day})
        2. Respeten las preferencias del usuario
        3. Sean relativamente sencillas de preparar en casa
        
        Para cada receta, busca una URL de imagen real y de alta calidad que muestre exactamente cómo se ve el plato terminado.
        Las imágenes deben ser atractivas, profesionales y de sitios como Unsplash, Pexels o de blogs culinarios confiables.
        Evita usar URLs de imágenes protegidas por derechos de autor o imágenes genéricas.
        
        Devuelve solo las sugerencias con el siguiente formato JSON (sin explicaciones adicionales):
        {{
            "recomendaciones": [
                {{
                    "nombre": "Nombre del plato",
                    "descripcion": "Breve descripción (máximo 60 caracteres)",
                    "tiempo_preparacion": "XX minutos",
                    "dificultad": "Fácil/Media/Difícil",
                    "ingredientes": ["Ingrediente 1", "Ingrediente 2", "..."],
                    "pasos": ["Paso 1", "Paso 2", "..."],
                    "categoria": "desayuno, almuerzo, merienda, cena, postre o saludable",
                    "imagen_url": "URL de una imagen real del plato"
                }},
                ...
            ],
            "mensaje": "Un breve mensaje personalizado sobre por qué estas recetas son adecuadas"
        }}
        """
        
        # Usar TestIAGemini para generar la respuesta
        response_text = generar_respuesta_texto(prompt)
        
        # Procesar la respuesta para obtener solo el JSON
        import json
        import re
        
        # Extraer el bloque JSON si está dentro de comillas de código
        json_match = re.search(r'```json\n(.*?)\n```', response_text, re.DOTALL)
        if json_match:
            json_str = json_match.group(1)
        else:
            json_str = response_text
        
        try:
            recommendations = json.loads(json_str)
            
            # Verificar y ajustar URLs de imágenes
            for receta in recommendations.get('recomendaciones', []):
                # Si Gemini proporcionó una imagen_url, úsala como primera opción
                if not 'imagen_url' in receta or not receta['imagen_url'].startswith('http'):
                    # Como respaldo, usar imágenes por categoría
                    categoria = receta.get('categoria', time_of_day).lower()
                    if categoria in image_dict:
                        receta['imagen_url'] = image_dict[categoria]
                    else:
                        receta['imagen_url'] = image_dict.get('saludable')  # Imagen predeterminada
    
            return jsonify({
                'success': True,
                'data': recommendations
            })
        except json.JSONDecodeError:
            return jsonify({
                'success': False,
                'message': 'Error al analizar las recomendaciones',
                'rawResponse': response_text
            }), 500
            
    except Exception as e:
        print(f"Error al generar recomendaciones especiales: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Error al generar recomendaciones: {str(e)}'
        }), 500

if __name__ == '__main__':
    app.run(debug=True)