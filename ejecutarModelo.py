import cv2
import numpy as np
import cuia as cuia
import sys

cam = 2
bk = cuia.bestBackend(cam)

# Obtenemos el alto y ancho de los frames capturados por la cámara
webcam = cv2.VideoCapture(cam,bk)
ancho = int(webcam.get(cv2.CAP_PROP_FRAME_WIDTH))
alto = int(webcam.get(cv2.CAP_PROP_FRAME_HEIGHT))
webcam.release()

try:
    # Importamos la matriz característica de la cámara y sus coeficientes de distorsión del fichero de calibrado
    import camara
    cameraMatrix = camara.cameraMatrix
    distCoeffs = camara.distCoeffs
except ImportError:
    # Si la cámara no estaba calibrada suponemos que no presenta distorsiones
    cameraMatrix = np.array([[ 1000,    0, ancho/2],
                             [    0, 1000,  alto/2],
                             [    0,    0,       1]])
    distCoeffs = np.zeros((5, 1)) 

modelo_path = sys.argv[1] if len(sys.argv) > 1 else 'modelos3D/Lays bag.glb'
modelo = cuia.modeloGLTF(modelo_path) # Cargamos el modelo 3D
modelo.rotar((np.pi/2.0, 0, 0)) # Rotar el modelo 90 grados en X para que coincida con el punto de vista que se obtiene en Blender
modelo.escalar(1) # Escalado uniforme del modelo
modelo.flotar() # Sitúa el modelo en el rango positivo del eje Z
# Reproducimos las animaciones que haya en el modelo
lista_animaciones = modelo.animaciones()
if len(lista_animaciones) > 0:
    modelo.animar(lista_animaciones[0])



def fromOpencvToPygfx(rvec, tvec):
    pose = np.eye(4)
    pose[0:3,3] = tvec.T
    pose[0:3,0:3] = cv2.Rodrigues(rvec)[0]
    pose[1:3] *= -1  # Inversión de los ejes Y y Z
    pose = np.linalg.inv(pose)
    return(pose)

def fov(cameraMatrix, ancho, alto):
    if ancho > alto:
        f = cameraMatrix[1, 1]
        fov_rad = 2 * np.arctan(alto / (2 * f))
    else:
        f = cameraMatrix[0, 0]
        fov_rad = 2 * np.arctan(ancho / (2 * f))
    return np.rad2deg(fov_rad)

escena = cuia.escenaPYGFX(fov(cameraMatrix, ancho, alto), ancho, alto)
escena.agregar_modelo(modelo)
escena.ilumina_modelo(modelo)
escena.iluminar() # Agrega iluminación ambiental

ar = cuia.myVideo(cam, bk) # Iniciamos un objeto myVideo


diccionario = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_5X5_50)
detector = cv2.aruco.ArucoDetector(diccionario)

def detectarPose(frame, tam): # tam es el tamaño en metros del marcador
    bboxs, ids, rechazados = detector.detectMarkers(frame)
    if ids is not None:
        objPoints = np.array([[-tam/2.0, tam/2.0, 0.0],
                              [tam/2.0, tam/2.0, 0.0],
                              [tam/2.0, -tam/2.0, 0.0],
                              [-tam/2.0, -tam/2.0, 0.0]])
        resultado = {}
        for i in range(len(ids)):
                ret, rvec, tvec = cv2.solvePnP(objPoints, bboxs[i], cameraMatrix, distCoeffs)
                if ret:
                    resultado[ids[i][0]] = (rvec, tvec)
        return((True, resultado))
    return((False, None))

def realidadMixta(frame):
    ret, pose = detectarPose(frame, 0.19)
    if ret and pose[0]:
        M = fromOpencvToPygfx(pose[0][0], pose[0][1])
        escena.actualizar_camara(M)
        imagen_render = escena.render()
        imagen_render_bgr = cv2.cvtColor(imagen_render, cv2.COLOR_RGBA2BGRA)
        resultado = cuia.alphaBlending(imagen_render_bgr, frame)
    else:
        resultado = frame
        
    return resultado

ar.process = realidadMixta
try:
    ar.play("AR", key=ord(' '))
finally:
    ar.release()