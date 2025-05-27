import cv2
import numpy as np
import os
import sys
import matplotlib.pyplot as plt
import base64
import argparse

#Ejemplo de uso
"""
from FaceRecognition.faceRecognition import obtener_token

# Simplemente llama al método con la ruta de la imagen
token = obtener_token("ruta/a/la/imagen.jpg")

if token:
    print(f"Token generado: {token}")
    # Usa el token como necesites - almacenarlo en base de datos, compararlo, etc.

"""

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
    return encrypted

def get_face_embedding(image_path):
    """Procesa la imagen y devuelve el embedding encriptado del rostro."""
    try:
        # Leer la imagen
        img = read_image(image_path)
        
        # Crear y configurar el detector de rostros
        detector = cv2.FaceDetectorYN.create(path_detection, "", (img.shape[1], img.shape[0]), score_threshold=0.7)
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
            # Mostrar la imagen para verificar
            plt.imshow(img)
            plt.title("Imagen sin rostros detectados")
            plt.axis('off')
            plt.show()
            return {
                "success": False,
                "error": "No se detectaron rostros en la imagen"
            }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

def obtener_token(ruta_imagen):
    """
    Método simplificado que recibe la ruta de una imagen y devuelve el token encriptado.
    
    Args:
        ruta_imagen: Ruta a la imagen para procesar
        
    Returns:
        String con el token encriptado o None si no se pudo generar
    """
    result = get_face_embedding(ruta_imagen)
    
    if result["success"]:
        return result["encrypted_embedding"].decode('utf-8')
    else:
        print(f"Error al generar token: {result['error']}")
        return None

def main():
    # Configurar el parser de argumentos
    parser = argparse.ArgumentParser(description="Extracción de características faciales encriptadas")
    parser.add_argument("image_path", help="Ruta a la imagen para procesar")
    args = parser.parse_args()
    
    # Usar el método simplificado
    token = obtener_token(args.image_path)
    
    if token:
        print("\nToken facial generado:")
        print(token)

if __name__ == "__main__":
    main()