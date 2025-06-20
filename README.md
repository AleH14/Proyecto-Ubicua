# Proyecto-Ubicua

Proyecto-Ubicua es una plataforma que integra modelos de IA, reconocimiento facial y de voz, y una API web construida con Flask, diseñada para ofrecer funcionalidades avanzadas en múltiples áreas.

## Tabla de Contenidos

- [Instalación](#instalación)
- [Requisitos Adicionales](#requisitos-adicionales)
- [Configuración de Claves y Servicios](#configuración-de-claves-y-servicios)
- [Uso Básico](#uso-básico)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Modelos 3D](#modelos-3d)
- [Contribuciones](#contribuciones)
- [Licencia](#licencia)

## Instalación

1. **Clona el repositorio:**

   ```bash
   git clone https://github.com/AleH14/Proyecto-Ubicua.git
   cd Proyecto-Ubicua
   ```

2. **Crea un entorno virtual (opcional pero recomendado):**

   ```bash
   python -m venv venv
   source venv/bin/activate  # En Windows: venv\Scripts\activate
   ```

3. **Instala las dependencias:**
   
      -En la carpeta about se encuentra requirements.txt mas la documentacion del programa.

   ```bash
   pip install --upgrade pip
   cd About
   pip install -r requirements.txt
   ```

## Requisitos Adicionales

Algunas librerías de este proyecto requieren pasos adicionales o dependencias del sistema para funcionar correctamente:
- **Para el reconocimiento facial**
  - Se utiliza face_detection_yunet_2023mar y face_recognition_sface_2021dec que no estan disponible en el repositorio pero puedes descargarlos de internet y colocarlo segun la estructura de carpetas que explico aqui abajo.

- **opencv-python**
  - Puede requerir paquetes del sistema para el soporte de video o GUI, especialmente en servidores o entornos headless.

- **Google Speech Recognition**
  - Debes habilitar la API de Speech-to-Text en Google Cloud Platform y descargar el archivo de credenciales JSON.
- **API OPEN AI**
  - Debes habilitar la API de OPEN IA.
- **Instalar el Gestor de Base de Datos de MongoDB**
  - Instalar la version version v8.0.9.


- **Toma en cuenta:**
  1. Algunas librerías pueden requerir privilegios de administrador o la instalación de dependencias del sistema operativo.
  2. Es fundamental usar versiones compatibles de Python (se recomienda Python 3.7 o superior) para evitar errores de compatibilidad.

## Configuración de Claves y Servicios

Para ejecutar el proyecto correctamente, debes crear un archivo `.env` en la raíz del repositorio con las siguientes variables:

```env
OPENAI_API_KEY=tu_apikey_openai
GOOGLE_API_KEY=tu_apikey_google_gemini
GOOGLE_API_KEY=tu_secretkey
```

**Importante:**
- Ten encuenta que el API de OPEN IA es de paga
- El archivo `.env` **no** debe compartirse ni subirse a control de versiones.
- Las claves deben ser válidas y tener los permisos necesarios en sus respectivas plataformas.

### Google Cloud Platform

- Habilita la API de Speech Recognition en tu proyecto de Google Cloud.
- Activa la autenticación servidor a servidor (service account) y descarga el archivo JSON de credenciales.
- Define la variable de entorno `GOOGLE_APPLICATION_CREDENTIALS` apuntando a tu archivo JSON:

  ```bash
  export GOOGLE_APPLICATION_CREDENTIALS="/ruta/a/tu/credencial.json"
  ```

- Instala la librería client de Google Speech Recognition si no está incluida.

## Uso Básico

Un ejemplo simple para iniciar la API Flask:

```python
from flask import Flask
from flask_cors import CORS

#Codigo Existente

if __name__ == "__main__":
    app.run(debug=True)
```

Para ejecutarlo:

```bash
python app.py
```

> Asegúrate de configurar tus variables de entorno en un archivo `.env` y exportar las credenciales de Google Cloud como se indicó antes.
>Luego busca en los archivos Login.html dale doble clic y disfruta!!!


## Estructura del Proyecto

```
Proyecto-Ubicua/
│
├── app.py                  # Archivo principal de la API Flask 
├── About
│    └── requirements.txt    #Para instalar librerias
├── FaceRecognition
│    └── dnns/
│        └── face_detection_yunet_2023mar.onnx #Pesos para realizar la deteccion y reconocimiento de cara (No diponible en el repositorio)
│            face_recognition_sface_2021dec.onnx
├── .env                    # (NO SE INCLUYE, solo ejemplo local)
├── Modelos3D/              # Carpeta para modelos 3D (vacía por defecto)
│   └── Fruta/
│       └── Naranja.glb
├── ...
```

## Modelos 3D

Actualmente, los modelos tridimensionales **no están incluidos** en el repositorio debido a su peso. Sin embargo, próximamente se publicarán en otra plataforma. Si necesitas agregar modelos, la estructura recomendada es la siguiente:

```
Proyecto-Ubicua/
├── Modelos3D/
│   └── Fruta/
│       └── Naranja.glb
```

Coloca tus archivos `.glb` en la carpeta correspondiente para integrarlos con el sistema.

## Contribuciones

¡Las contribuciones son bienvenidas! Por favor, abre un issue o pull request siguiendo las buenas prácticas del repositorio.

## Licencia

Este proyecto está bajo la licencia MIT.
