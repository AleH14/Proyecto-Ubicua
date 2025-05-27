import cv2
import numpy as np
import os
import base64
import argparse

# Eliminar importaciones de matplotlib
# import matplotlib.pyplot as plt  # ELIMINAR ESTA LÍNEA

# Rutas de los modelos
path_detection = "FaceRecognition/dnns/face_detection_yunet_2023mar.onnx"
path_recognition = "FaceRecognition/dnns/face_recognition_sface_2021dec.onnx"

def read_image(image_path):
    """Lee y convierte la imagen de BGR a RGB."""
    image = cv2.imread(image_path)
    if image is None:
        raise ValueError(f"No se pudo cargar la imagen: {image_path}")
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    return image

def encrypt_embedding(embedding):
    """Encripta el vector de características usando base64."""
    # Convertir el numpy array a bytes
    embedding_bytes = embedding.tobytes()
    # Encriptar usando base64
    encrypted = base64.b64encode(embedding_bytes)
    return encrypted.decode('utf-8')  # Convertir a string

def decrypt_embedding(encrypted_embedding):
    """Desencripta un embedding previamente encriptado con base64."""
    # Decodificar base64 a bytes
    if isinstance(encrypted_embedding, str):
        embedding_bytes = base64.b64decode(encrypted_embedding)
    else:
        embedding_bytes = base64.b64decode(encrypted_embedding)
    # Convertir bytes a numpy array (vector de 128 dimensiones de tipo float32)
    embedding = np.frombuffer(embedding_bytes, dtype=np.float32)
    return embedding

def calculate_similarity(embedding1, embedding2):
    """Calcula la similitud coseno entre dos embeddings."""
    return np.dot(embedding1, embedding2) / (np.linalg.norm(embedding1) * np.linalg.norm(embedding2))

def get_face_embedding(image_path):
    """Procesa la imagen y devuelve el embedding del rostro."""
    try:
        # Leer la imagen
        img = read_image(image_path)
        
        # Crear y configurar el detector de rostros
        detector = cv2.FaceDetectorYN.create(path_detection, "", (img.shape[1], img.shape[0]),score_threshold=0.7)
        _, faces = detector.detect(img)
        
        # Verificar si se detectaron rostros
        if faces is not None and len(faces) > 0:
            # Crear el reconocedor de caras
            recognizer = cv2.FaceRecognizerSF.create(path_recognition, "")
            
            # Extraer embedding de la primera cara
            embedding = recognizer.feature(img, faces[0])
            
            # Encriptar el embedding
            encrypted_embedding = encrypt_embedding(embedding)
            
            return {
                "success": True,
                "embedding": embedding,
                "encrypted_embedding": encrypted_embedding
            }
        else:
            print("No se detectaron rostros en la imagen")
            # ELIMINAR estas líneas que usan matplotlib
            # plt.imshow(img)
            # plt.title("Imagen sin rostros detectados")
            # plt.axis('off')
            # plt.show()
            return {
                "success": False,
                "error": "No se detectaron rostros en la imagen"
            }
    except Exception as e:
        print(f"Error en get_face_embedding: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

def verify_face(image_path, encrypted_embedding_str, threshold=0.5):
    """
    Verifica si la cara en la imagen corresponde al embedding encriptado.
    
    Args:
        image_path: Ruta a la imagen a verificar
        encrypted_embedding_str: String con el embedding encriptado en base64
        threshold: Umbral de similitud (valores típicos entre 0.3-0.5)
        
    Returns:
        Un diccionario con el resultado de la verificación
    """
    try:
        # Obtener el embedding de la imagen
        result = get_face_embedding(image_path)
        
        if not result["success"]:
            return {
                "match": False,
                "error": result["error"]
            }
            
        # Desencriptar el embedding recibido
        try:
            stored_embedding = decrypt_embedding(encrypted_embedding_str)
        except Exception as e:
            print(f"Error al desencriptar embedding: {str(e)}")
            return {
                "match": False,
                "error": f"Error al desencriptar embedding: {str(e)}"
            }
        
        # Calcular similitud
        similarity = float(calculate_similarity(result["embedding"], stored_embedding))
        
        # Determinar si es la misma persona
        is_match = similarity >= threshold
        
        return {
            "match": is_match,
            "similarity": similarity,
            "threshold": threshold
        }
        
    except Exception as e:
        print(f"Error en verify_face: {str(e)}")
        return {
            "match": False,
            "error": str(e)
        }

def verificar_identidad(ruta_imagen, token_encriptado, umbral=0.4):
    """
    Función simplificada para verificar si una imagen corresponde a un token encriptado.
    Muestra los resultados directamente en pantalla.
    
    Args:
        ruta_imagen: Ruta a la imagen para verificar
        token_encriptado: Vector de características encriptado en base64
        umbral: Umbral de similitud (opcional, por defecto 0.4)
    """
    # Verificar identidad
    result = verify_face(ruta_imagen, token_encriptado, umbral)
    
    if "error" in result:
        print(f"Error: {result['error']}")
    else:
        if result["match"]:
            print(f"\n✅ COINCIDENCIA: Es la misma persona")
        else:
            print(f"\n❌ NO COINCIDE: No es la misma persona")
        
        print(f"Similitud: {result['similarity']:.4f}")
        print(f"Umbral: {result['threshold']}")

def main():
    # Configurar el parser de argumentos
    parser = argparse.ArgumentParser(description="Verificación facial")
    parser.add_argument("image_path", help="Ruta a la imagen para verificar")
    parser.add_argument("encrypted_embedding", help="Vector de características encriptado para comparar")
    parser.add_argument("--threshold", type=float, default=0.4, 
                      help="Umbral de similitud (por defecto: 0.4)")
    
    args = parser.parse_args()
    
    # Usar la nueva función simplificada
    verificar_identidad(args.image_path, args.encrypted_embedding, args.threshold)

if __name__ == "__main__":
    main()