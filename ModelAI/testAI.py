from openai import OpenAI
import os
from dotenv import load_dotenv
from datetime import datetime

# Cargar variables de entorno
load_dotenv() 
api_key = os.getenv("OPENAI_API_KEY")

# Inicializar cliente de OpenAI
client = OpenAI(api_key=api_key)

def get_ai_response(user_message, user_orders=None, conversation_history=None, user_data=None):
    """
    Función que envía un mensaje a la API de OpenAI y devuelve la respuesta.
    
    Args:
        user_message (str): Mensaje del usuario
        user_orders (list, optional): Historial de pedidos del usuario
        conversation_history (list, optional): Historial de mensajes anteriores
        user_data (dict, optional): Información adicional del usuario
        
    Returns:
        str: Respuesta generada por el modelo
    """
    try:
        # Preparar el mensaje del sistema con información adicional si hay historial
        system_message = "Eres un asistente de FoodDelivery, una app de entrega de comida a domicilio. Sé amable y útil con los usuarios."
        
        # Si tenemos historial de pedidos, lo añadimos al contexto
        if user_orders and len(user_orders) > 0:
            order_history = "\n\nHistorial de pedidos del usuario:"
            for i, order in enumerate(user_orders[:5]):
                order_history += f"\n- {order['productName']} (€{order['price']}), Categoría: {order.get('categoria', 'No especificada')}"
            
            system_message += order_history
            system_message += "\n\nPuedes usar este historial para hacer recomendaciones personalizadas."
        
        # Info contextual (ubicación, hora, preferencias)
        context_info = ""

        # Información de ubicación si está disponible
        if user_data and 'location' in user_data:
            context_info += f"\n\nUbicación del usuario: {user_data['location']}"

        # Información de preferencias si está disponible
        if user_data and 'preferences' in user_data:
            context_info += "\n\nPreferencias del usuario:"
            for pref in user_data['preferences']:
                context_info += f"\n- {pref}"
        
        # Información de restricciones dietéticas
        if user_data and 'dietary_restrictions' in user_data:
            context_info += "\n\nRestricciones dietéticas:"
            for restriction in user_data['dietary_restrictions']:
                context_info += f"\n- {restriction}"

        # Añadir la hora actual para contexto temporal
        current_time = datetime.now()
        hour = current_time.hour
        time_context = "mañana" if 5 <= hour < 12 else "tarde" if 12 <= hour < 20 else "noche"
        context_info += f"\n\nHora actual: {current_time.strftime('%H:%M')} ({time_context})"

        system_message += context_info

        # Construir la lista de mensajes para la API
        messages = [{"role": "system", "content": system_message}]
        
        # Añadir el historial de conversación si existe
        if conversation_history and len(conversation_history) > 0:
            messages.extend(conversation_history)
        
        # Añadir el mensaje actual del usuario
        messages.append({"role": "user", "content": user_message})

        completion = client.chat.completions.create(
            model="gpt-4.1",
            store=True,
            messages=messages
        )
        
        # Guardar la respuesta para devolver y actualizar el historial
        response = completion.choices[0].message.content
        
        # Actualizar el historial si es necesario en el código que llama a esta función
        return response
    except Exception as e:
        print(f"Error al comunicarse con OpenAI: {str(e)}")
        return "Lo siento, estoy teniendo problemas para responder en este momento."

# Si ejecutamos este archivo directamente, realizar una prueba
if __name__ == "__main__":
    test_message = "write a python script that uses the openai library to create a chat completion using the gpt-4.1 model."
    print(get_ai_response(test_message))
