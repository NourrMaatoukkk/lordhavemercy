"""
Simple Python HTTP server that streams live camera frames with emotion detection
Serves frames at http://localhost:5000/frame as JPEG
"""

import cv2
import numpy as np
from deepface import DeepFace
import pandas as pd
import os
from datetime import datetime
from http.server import BaseHTTPRequestHandler, HTTPServer
import threading
import time
import base64

# Configuration
PORT = 5000
CSV_FILE = "emotion_log.csv"

# Global variables
current_frame = None
frame_lock = threading.Lock()
cap = None
emotion_history = []

def init_students():
    """Load student data from CSV"""
    try:
        students_df = pd.read_csv("students.csv", encoding="utf-8-sig")
        students_df.columns = students_df.columns.str.strip()
        id_to_name = {
            int(row["Student ID"]): row["Student Name"]
            for _, row in students_df.iterrows()
            if not pd.isna(row["Student ID"])
        }
        return id_to_name
    except Exception as e:
        print(f"Error loading students: {e}")
        return {}

def init_camera():
    """Try to initialize camera from available sources"""
    global cap
    for idx in [0, 1, 2, 3]:
        try:
            cap = cv2.VideoCapture(idx)
            ret, frame = cap.read()
            if ret:
                print(f"Camera initialized at index {idx}")
                return True
            cap.release()
        except:
            pass
    print("No camera found - running in demo mode")
    return False

def save_emotion(student_id, emotion, confidence):
    """Append emotion detection to CSV"""
    try:
        row = [[
            student_id,
            datetime.now().strftime("%H:%M:%S"),
            emotion,
            confidence,
            "L1"
        ]]
        pd.DataFrame(row).to_csv(CSV_FILE, mode="a", header=False, index=False)
    except Exception as e:
        print(f"Error saving emotion: {e}")

def camera_worker():
    """Background thread that processes camera frames"""
    global current_frame, cap, emotion_history
    
    camera_available = init_camera()
    id_to_name = init_students()
    frame_count = 0
    
    while True:
        try:
            if not camera_available or cap is None:
                # Demo mode: generate a placeholder image
                placeholder = np.zeros((480, 640, 3), dtype=np.uint8)
                cv2.putText(placeholder, "Camera Not Available", (150, 240),
                           cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 255), 2)
                cv2.putText(placeholder, "Running in Demo Mode", (160, 300),
                           cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
                with frame_lock:
                    current_frame = placeholder
                time.sleep(0.5)
                continue
            
            ret, frame = cap.read()
            if not ret:
                break
            
            # Flip for mirror effect
            frame = cv2.flip(frame, 1)
            
            frame_count += 1
            
            # Process every 3rd frame to save CPU
            if frame_count % 3 == 0:
                try:
                    results = DeepFace.analyze(
                        frame,
                        actions=["emotion"],
                        enforce_detection=False,
                        detector_backend="opencv",
                        silent=True
                    )
                    
                    if isinstance(results, dict):
                        results = [results]
                    
                    for res in results:
                        x = res["region"]["x"]
                        y = res["region"]["y"]
                        w = res["region"]["w"]
                        h = res["region"]["h"]
                        
                        emotion = res["dominant_emotion"].capitalize()
                        confidence = round(res["emotion"][res["dominant_emotion"]] / 100, 2)
                        
                        # Draw rectangle and label
                        cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
                        label = f"{emotion} ({confidence})"
                        cv2.putText(frame, label, (x, y - 10),
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                        
                        # Save to emotion log
                        save_emotion("Detected_Face", emotion, confidence)
                        
                        # Track history
                        emotion_history.append({
                            "emotion": emotion,
                            "confidence": confidence,
                            "time": datetime.now().strftime("%H:%M:%S")
                        })
                        
                        # Keep history manageable
                        if len(emotion_history) > 1000:
                            emotion_history = emotion_history[-1000:]
                
                except Exception as e:
                    print(f"Emotion detection error: {e}")
            
            # Update global frame
            with frame_lock:
                current_frame = frame
            
            time.sleep(0.033)  # ~30 FPS
        
        except Exception as e:
            print(f"Camera worker error: {e}")
            time.sleep(1)

class CameraStreamHandler(BaseHTTPRequestHandler):
    """HTTP handler for streaming camera frames"""
    
    def do_GET(self):
        if self.path == "/frame":
            self.send_response(200)
            self.send_header("Content-Type", "image/jpeg")
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
            self.end_headers()
            
            with frame_lock:
                if current_frame is not None:
                    ret, buffer = cv2.imencode(".jpg", current_frame)
                    self.wfile.write(buffer.tobytes())
                else:
                    # Send a placeholder image
                    placeholder = np.zeros((480, 640, 3), dtype=np.uint8)
                    cv2.putText(placeholder, "Initializing...", (200, 240),
                               cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
                    ret, buffer = cv2.imencode(".jpg", placeholder)
                    self.wfile.write(buffer.tobytes())
        
        elif self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"status": "ok"}')
        
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        # Suppress default logging
        pass

def run_server():
    """Start HTTP server"""
    server = HTTPServer(("0.0.0.0", PORT), CameraStreamHandler)
    print(f"Camera Stream Server started on http://0.0.0.0:{PORT}")
    print(f"Access camera feed at http://localhost:{PORT}/frame")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped")
        if cap is not None:
            cap.release()
        cv2.destroyAllWindows()

if __name__ == "__main__":
    # Create/initialize emotion_log.csv if it doesn't exist
    if not os.path.exists(CSV_FILE):
        pd.DataFrame(columns=["Student_ID", "Time", "Emotion", "Confidence", "Lecture_ID"]).to_csv(
            CSV_FILE, index=False
        )
    
    # Start camera worker thread
    camera_thread = threading.Thread(target=camera_worker, daemon=True)
    camera_thread.start()
    
    # Start HTTP server
    run_server()
