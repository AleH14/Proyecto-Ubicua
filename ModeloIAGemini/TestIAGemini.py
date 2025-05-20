import os
from dotenv import load_dotenv
import google.generativeai as genai
import PIL.Image

# Cargar variables de entorno
load_dotenv()

# Configurar la API con tu clave
API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=API_KEY)

# Función para listar modelos disponibles
def listar_modelos_disponibles():
    print("Modelos disponibles:")
    for m in genai.list_models():
        print(f"- {m.name}")

# Función para generar respuestas de texto
def generar_respuesta_texto(prompt):
    """Genera una respuesta basada en un prompt de texto"""
    # Usamos los modelos disponibles según la lista mostrada
    try:
        model = genai.GenerativeModel('models/gemini-1.5-pro')
        response = model.generate_content(prompt)
        return response.text
    except Exception as e1:
        try:
            model = genai.GenerativeModel('models/gemini-1.5-flash')
            response = model.generate_content(prompt)
            return response.text
        except Exception as e2:
            return f"Error con los modelos intentados:\n1: {e1}\n2: {e2}"

# Función para generar respuestas basadas en imágenes y texto
def generar_respuesta_imagen(prompt, imagen_path):
    """Genera una respuesta basada en un prompt de texto y una imagen"""
    try:
        model = genai.GenerativeModel('models/gemini-pro-vision')
        image = PIL.Image.open(imagen_path)
        response = model.generate_content([prompt, image])
        return response.text
    except Exception as e1:
        try:
            model = genai.GenerativeModel('models/gemini-1.0-pro-vision-latest')
            image = PIL.Image.open(imagen_path)
            response = model.generate_content([prompt, image])
            return response.text
        except Exception as e2:
            return f"Error con los modelos de visión:\n1: {e1}\n2: {e2}"

# Función para chat conversacional
def iniciar_chat():
    """Inicia una sesión de chat con el modelo"""
    try:
        model = genai.GenerativeModel('models/gemini-1.5-pro')
        chat = model.start_chat(history=[])
        return chat
    except Exception as e:
        print(f"Error al iniciar chat: {e}")
        return None

def enviar_mensaje_chat(chat, mensaje):
    """Envía un mensaje al chat existente"""
    if chat is None:
        return "Error: Chat no inicializado correctamente"
    try:
        response = chat.send_message(mensaje)
        return response.text
    except Exception as e:
        return f"Error al enviar mensaje: {e}"

# Ejemplo de uso
if __name__ == "__main__":
    # Listar modelos disponibles para diagnóstico
    print("=== Modelos disponibles en tu cuenta ===")
    listar_modelos_disponibles()
    
    print("\n=== Ejemplo de generación de texto ===")
    respuesta = generar_respuesta_texto("Explica brevemente qué es la inteligencia artificial")
    print(respuesta)
    
    # Descomentar para probar con imágenes
    # print("\n=== Ejemplo de análisis de imagen ===")
    # respuesta_imagen = generar_respuesta_imagen(
    #     "¿Qué se muestra en esta imagen?", 
    #     "ruta/a/tu/imagen.jpg"
    # )
    # print(respuesta_imagen)
    
    print("\n=== Ejemplo de chat ===")
    chat = iniciar_chat()
    if chat:
        print("Bot:", enviar_mensaje_chat(chat, "Hola, ¿cómo funcionas?"))
        print("Bot:", enviar_mensaje_chat(chat, "Dame tres ejemplos de aplicaciones prácticas"))
    else:
        print("No se pudo iniciar el chat.")