import cv2
import numpy as np


fr = cv2.FaceRecognizerSF.create("dnns/face_recognition_sface_2021dec.onnx", "")