from openai import OpenAI
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv() 
api_key = os.getenv("OPENAI_API_KEY")

# Inicializar cliente de OpenAI
client = OpenAI(api_key=api_key)

def get_ai_response(user_message):
    """
    Función que envía un mensaje a la API de OpenAI y devuelve la respuesta.
    
    Args:
        user_message (str): Mensaje del usuario
        
    Returns:
        str: Respuesta generada por el modelo
    """
    try:
        completion = client.chat.completions.create(
            model="gpt-4.1",
            store=True,
            messages=[
                {"role": "system", "content": "Eres un asistente de FoodDelivery, una app de entrega de comida a domicilio. Sé amable y útil con los usuarios."},
                {"role": "user", "content": user_message}
            ]
        )
        
        return completion.choices[0].message.content
    except Exception as e:
        print(f"Error al comunicarse con OpenAI: {str(e)}")
        return "Lo siento, estoy teniendo problemas para responder en este momento."

# Si ejecutamos este archivo directamente, realizar una prueba
if __name__ == "__main__":
    test_message = "write a python script that uses the openai library to create a chat completion using the gpt-4.1 model."
    print(get_ai_response(test_message))
