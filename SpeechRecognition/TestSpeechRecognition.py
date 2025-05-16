import os
import io
import time
import numpy as np
from dotenv import load_dotenv
from google.cloud import speech

# Cargar variables de entorno
load_dotenv()

# Configurar la ruta al archivo de credenciales
credential_path = "keySpeechRecognition.json"
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.path.abspath(credential_path)

def transcribe_file(speech_file):
    """Transcribe el contenido de un archivo de audio."""
    
    # Inicializar el cliente
    client = speech.SpeechClient()

    # Leer el archivo de audio
    with io.open(speech_file, "rb") as audio_file:
        content = audio_file.read()

    # Configurar el audio para el reconocimiento
    audio = speech.RecognitionAudio(content=content)
    
    # Configurar los parámetros de reconocimiento
    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
        sample_rate_hertz=16000,
        language_code="es-ES",  # Cambia según el idioma que necesites
    )

    # Detectar el habla en el audio
    response = client.recognize(config=config, audio=audio)

    # Procesar los resultados
    for result in response.results:
        print(f"Transcripción: {result.alternatives[0].transcript}")
        print(f"Confianza: {result.alternatives[0].confidence}")
    
    return response.results

def record_and_transcribe_audio():
    """Graba audio del micrófono hasta detectar silencio de 0.5 segundos,
    luego envía el audio al API para su transcripción."""
    try:
        import pyaudio
        import numpy as np
    except ImportError:
        print("Por favor instala PyAudio y NumPy: pip install pyaudio numpy")
        return ""
    
    # Configuración de audio
    RATE = 16000
    CHUNK = int(RATE / 10)  # 100ms
    FORMAT = pyaudio.paInt16
    CHANNELS = 1
    
    # Umbral para detectar silencio y tiempo
    SILENCE_THRESHOLD_AMP = 100  # Ajusta este valor según la sensibilidad deseada
    SILENCE_DURATION = 0.5  # Segundos de silencio para finalizar
    
    # Variables para control
    audio_buffer = []
    is_speaking = False
    silent_start_time = None
    
    # Inicializar PyAudio
    audio = pyaudio.PyAudio()
    stream = audio.open(
        format=FORMAT,
        channels=CHANNELS,
        rate=RATE,
        input=True,
        frames_per_buffer=CHUNK,
    )
    
    print("Grabando... (Habla ahora, se detectará silencio automáticamente)")
    
    try:
        # Grabar audio hasta detectar silencio
        while True:
            data = stream.read(CHUNK, exception_on_overflow=False)
            audio_buffer.append(data)
            
            # Analizar si hay silencio o habla
            audio_data = np.frombuffer(data, dtype=np.int16)
            volume_norm = np.abs(audio_data).mean()
            
            # Debug del volumen
            # print(f"Volumen: {volume_norm}")
            
            if volume_norm > SILENCE_THRESHOLD_AMP:
                is_speaking = True
                silent_start_time = None
            elif is_speaking:
                # Si estaba hablando y ahora hay silencio
                if silent_start_time is None:
                    silent_start_time = time.time()
                elif time.time() - silent_start_time > SILENCE_DURATION:
                    print("Silencio detectado. Finalizando grabación...")
                    break
    
    finally:
        # Cerrar recursos de audio
        stream.stop_stream()
        stream.close()
        audio.terminate()
    
    if not audio_buffer or not is_speaking:
        print("No se detectó audio significativo")
        return ""
    
    print("Transcribiendo audio grabado...")
    
    # Convertir el buffer de audio en bytes
    audio_content = b''.join(audio_buffer)
    
    # Inicializar cliente de reconocimiento de voz
    client = speech.SpeechClient()
    
    # Configurar para reconocimiento
    audio_obj = speech.RecognitionAudio(content=audio_content)
    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
        sample_rate_hertz=RATE,
        language_code="es-ES",
    )
    
    # Realizar la solicitud de reconocimiento
    response = client.recognize(config=config, audio=audio_obj)
    
    final_transcript = ""
    for result in response.results:
        if result.alternatives:
            final_transcript += result.alternatives[0].transcript
            print(f"Transcripción: {result.alternatives[0].transcript}")
    
    return final_transcript

# Ejemplo de uso
if __name__ == "__main__":
    # Realizar grabación y transcripción con detección automática de silencio
    resultado = record_and_transcribe_audio()
    
    print("\n--- Resultado final ---")
    print(f"Texto reconocido: {resultado}")