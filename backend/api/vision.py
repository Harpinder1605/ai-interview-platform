from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import cv2
import numpy as np
import base64
import os
import asyncio
from jose import JWTError, jwt
from auth.security import SECRET_KEY, ALGORITHM

router = APIRouter()

# Load OpenCV's pre-trained Haar Cascades for Face AND Eye tracking
cascade_path = cv2.data.haarcascades # type: ignore
face_cascade = cv2.CascadeClassifier(os.path.join(cascade_path, 'haarcascade_frontalface_default.xml'))
eye_cascade = cv2.CascadeClassifier(os.path.join(cascade_path, 'haarcascade_eye.xml'))

def process_frame_sync(img):
    """Runs heavy OpenCV processing in a separate background thread"""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
    num_faces = len(faces)
    
    if num_faces > 0:
        (x, y, w, h) = faces[0]
        roi_gray = gray[y:y+h, x:x+w]
        eyes = eye_cascade.detectMultiScale(roi_gray, scaleFactor=1.1, minNeighbors=10, minSize=(15, 15))
        
        if len(eyes) >= 1:
            return "Eye Contact Active 👁️", num_faces
        return "Looking away from camera", num_faces
    return "Look at the camera", 0

@router.websocket("/ws")
async def vision_websocket(websocket: WebSocket):
    # Extract token from query parameter
    token = websocket.query_params.get("token")
    
    if not token:
        await websocket.close(code=4001, reason="Missing token")
        return
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if not email:
            await websocket.close(code=4001, reason="Invalid token")
            return
    except JWTError:
        await websocket.close(code=4001, reason="Invalid token")
        return
        
    await websocket.accept()
    print("Frontend connected to Vision WebSocket!")
    try:
        while True:
            # Receive the base64-encoded frame
            data = await websocket.receive_text()
            
            # The frontend sends data in the format "data:image/jpeg;base64,/9j/4AAQ..."
            # We need to strip the prefix to get just the raw base64 string
            encoded_data = data.split(',')[1] if ',' in data else data
            
            # 1. Convert base64 string to bytes
            img_bytes = base64.b64decode(encoded_data)
            # 2. Convert bytes to a numpy array
            np_arr = np.frombuffer(img_bytes, np.uint8)
            # 3. Decode the numpy array into an OpenCV BGR image
            img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            
            feedback_msg = "Error processing frame"
            num_faces = 0
            
            if img is not None:
                # Offload to a separate thread to prevent Event Loop Starvation
                feedback_msg, num_faces = await asyncio.to_thread(process_frame_sync, img)
            
            await websocket.send_json({
                "status": "success",
                "message": feedback_msg,
                "faces_detected": int(num_faces) if img is not None else 0
            })
    except WebSocketDisconnect:
        print("Client disconnected from Vision WebSocket.")
    except Exception as e:
        print(f"Error in Vision WebSocket: {e}")