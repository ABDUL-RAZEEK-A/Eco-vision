from flask import Flask, render_template, Response, jsonify, request
from ultralytics import YOLO
import cv2
import numpy as np
import base64
import os
import time
import torch
from torchvision.ops import nms

app = Flask(__name__)
    
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
os.makedirs(os.path.join(BASE_DIR, "captures"), exist_ok=True)

# ──────────────────────────────────────────────────────────────
# Waste Category Mapping  (COCO class names)
# "person" is intentionally absent → always skipped
# ──────────────────────────────────────────────────────────────
WASTE_CATEGORIES = {
    # ── Degradable ──────────────────────────────────────────
    "banana":           "degradable",
    "apple":            "degradable",
    "sandwich":         "degradable",
    "orange":           "degradable",
    "broccoli":         "degradable",
    "carrot":           "degradable",
    "hot dog":          "degradable",
    "pizza":            "degradable",
    "donut":            "degradable",
    "cake":             "degradable",
    "food":             "degradable",
    "leaf":             "degradable",
    "paper":            "degradable",
    "book":             "degradable",
    
    # Custom model bio classes
    "organic":          "degradable",
    "paper_cups":       "degradable",
    "cardboard":        "degradable",
    "biological":       "degradable",

    # ── Non-Degradable ──────────────────────────────────────
    "bottle":           "non_degradable",
    "wine glass":       "non_degradable",
    "cup":              "non_degradable",
    "fork":             "non_degradable",
    "knife":            "non_degradable",
    "spoon":            "non_degradable",
    "bowl":             "non_degradable",
    "laptop":           "non_degradable",
    "mouse":            "non_degradable",
    "remote":           "non_degradable",
    "keyboard":         "non_degradable",
    "cell phone":       "non_degradable",
    "microwave":        "non_degradable",
    "oven":             "non_degradable",
    "toaster":          "non_degradable",
    "sink":             "non_degradable",
    "refrigerator":     "non_degradable",
    "scissors":         "non_degradable",
    "toothbrush":       "non_degradable",
    "hair drier":       "non_degradable",
    "vase":             "non_degradable",
    "umbrella":         "non_degradable",
    "backpack":         "non_degradable",
    "handbag":          "non_degradable",
    "suitcase":         "non_degradable",
    "frisbee":          "non_degradable",
    "sports ball":      "non_degradable",
    "kite":             "non_degradable",
    "skateboard":       "non_degradable",
    "surfboard":        "non_degradable",
    "tennis racket":    "non_degradable",
    "baseball bat":     "non_degradable",
    "baseball glove":   "non_degradable",
    "car":              "non_degradable",
    "motorcycle":       "non_degradable",
    "airplane":         "non_degradable",
    "bus":              "non_degradable",
    "train":            "non_degradable",
    "truck":            "non_degradable",
    "boat":             "non_degradable",
    "bicycle":          "non_degradable",
    "traffic light":    "non_degradable",
    "stop sign":        "non_degradable",
    "parking meter":    "non_degradable",
    "bench":            "non_degradable",
    "chair":            "non_degradable",
    "couch":            "non_degradable",
    "potted plant":     "non_degradable",
    "bed":              "non_degradable",
    "dining table":     "non_degradable",
    "toilet":           "non_degradable",
    "tv":               "non_degradable",
    "clock":            "non_degradable",
    "tie":              "non_degradable",

    # Custom model non-bio classes
    "aluminum_soda_cans":     "non_degradable",
    "glass_beverage_bottles": "non_degradable",
    "plastic_soda_bottles":   "non_degradable",
    "plastic_water_bottles":  "non_degradable",
    "e-waste":                "non_degradable",
    "glass":                  "non_degradable",
    "medical":                "non_degradable",
    "metal":                  "non_degradable",
    "plastic":                "non_degradable",
    "battery":                "non_degradable",
    "brown-glass":            "non_degradable",
    "clothes":                "non_degradable",
    "green-glass":            "non_degradable",
    "shoes":                  "non_degradable",
    "trash":                  "non_degradable",
    "white-glass":            "non_degradable",
}

# Classes to completely ignore (never classify, never show)
SKIP_LABELS = {
    "person", "people",
}

# ──────────────────────────────────────────────────────────────
MODEL_CONFIGS = [
    {"name": "yolov8n.pt", "desc": "Standard COCO 80 classes (General objects)"},
    {"name": "best.pt", "desc": "Custom Waste Model A"},
    {"name": "best (1).pt", "desc": "Custom Waste Model B"},
    {"name": "yolov8n-waste-12cls-best.pt", "desc": "12-Class Specific Waste Model (Plastic, Glass, etc)"}
]

models = []
for m_cfg in MODEL_CONFIGS:
    model_path = os.path.join(BASE_DIR, m_cfg["name"])
    if not os.path.exists(model_path):
        # Fallback to Downloads directory if present
        dl_path = os.path.expanduser(f"~/Downloads/{m_cfg['name']}")
        if os.path.exists(dl_path):
            model_path = dl_path
            
    if os.path.exists(model_path):
        try:
            m_obj = YOLO(model_path)
            models.append({"name": m_cfg["name"], "desc": m_cfg["desc"], "obj": m_obj})
            print(f"[Loaded Model] {m_cfg['name']} ({len(m_obj.names)} classes)")
        except Exception as e:
            print(f"[Error Loading Model] {model_path}: {e}")
    else:
        print(f"[Warning] Model file not found: {model_path}")

# Global state
detection_running = True
last_frame_bgr    = None
bio_count         = 0
nonbio_count      = 0


# ──────────────────────────────────────────────────────────────
@app.route("/")
def index():
    return render_template("index.html")


# ──────────────────────────────────────────────────────────────
# /detect  — POST
# Browser sends JPEG frame as base64.
# Returns normalised box list (no bitmapped annotated frame)
# so JS can draw smooth overlay boxes itself.
# ──────────────────────────────────────────────────────────────
@app.route("/detect", methods=["POST"])
def detect():
    global last_frame_bgr, bio_count, nonbio_count

    data = request.get_json(force=True)
    b64  = data.get("frame", "")
    active_models = data.get("active_models", [0]) # defaults to yolov8n.pt

    if "," in b64:
        b64 = b64.split(",", 1)[1]

    img_bytes = base64.b64decode(b64)
    np_arr    = np.frombuffer(img_bytes, dtype=np.uint8)
    frame     = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if frame is None:
        return jsonify({"error": "bad frame"}), 400

    frame_h, frame_w = frame.shape[:2]

    # Defaults
    boxes_out       = []
    top_label       = "Nothing Detected"
    top_category    = "unknown"
    top_confidence  = 0
    total_objects   = 0   # excludes persons

    if detection_running:
        all_raw_boxes = []
        all_scores = []
        all_labels = []
        
        # Run inference on active models
        for idx in active_models:
            if idx < len(models):
                m_dict = models[idx]
                m = m_dict["obj"]
                results = m.predict(frame, conf=0.65, imgsz=640, verbose=False)
                for box in results[0].boxes:
                    cid = int(box.cls[0])
                    lbl_raw = m.names[cid].lower()
                    
                    if lbl_raw in SKIP_LABELS:
                        continue
                        
                    conf = float(box.conf[0])
                    xyxy = box.xyxy[0].tolist()
                    
                    all_raw_boxes.append(xyxy)
                    all_scores.append(conf)
                    all_labels.append(lbl_raw)
                
        if len(all_raw_boxes) > 0:
            boxes_tensor = torch.tensor(all_raw_boxes)
            scores_tensor = torch.tensor(all_scores)
            
            # Apply NMS (class-agnostic, keep highest confidence box if overlapping heavily)
            keep_indices = nms(boxes_tensor, scores_tensor, iou_threshold=0.5)
            
            for idx in keep_indices:
                xyxy = all_raw_boxes[idx]
                conf = all_scores[idx]
                lbl_raw = all_labels[idx]
                
                category = WASTE_CATEGORIES.get(lbl_raw, "non_degradable")

                # Normalised 0-1 so JS can scale to any canvas size
                boxes_out.append({
                    "x1":         xyxy[0] / frame_w,
                    "y1":         xyxy[1] / frame_h,
                    "x2":         xyxy[2] / frame_w,
                    "y2":         xyxy[3] / frame_h,
                    "label":      lbl_raw.replace("_", " ").title(),
                    "category":   category,
                    "confidence": int(conf * 100),
                })

                # Running counters
                if category == "degradable":
                    bio_count += 1
                else:
                    nonbio_count += 1

        total_objects = len(boxes_out)

        if total_objects > 0:
            # Best = highest confidence among waste objects
            best = max(boxes_out, key=lambda b: b["confidence"])
            top_label      = best["label"]
            top_category   = best["category"]
            top_confidence = best["confidence"]

            # Save frame for /capture (draw minimal boxes via cv2 for the file)
            last_frame_bgr = frame.copy()

    return jsonify({
        "boxes":      boxes_out,        # list of normalised box dicts
        "label":      top_label,
        "category":   top_category,
        "confidence": top_confidence,
        "objects":    total_objects,
        "bio":        bio_count,
        "nonbio":     nonbio_count,
    })


# ──────────────────────────────────────────────────────────────
@app.route("/api/models")
def get_models():
    model_list = []
    for i, m_dict in enumerate(models):
        m_obj = m_dict["obj"]
        classes = list(m_obj.names.values())
        if len(classes) > 12:
            classes_str = ", ".join(classes[:12]) + f", and {len(classes)-12} more..."
        else:
            classes_str = ", ".join(classes)
            
        model_list.append({
            "id": i,
            "name": m_dict["name"],
            "desc": m_dict["desc"],
            "classes": classes_str
        })
    return jsonify(model_list)

# ──────────────────────────────────────────────────────────────
@app.route("/start")
def start():
    global detection_running
    detection_running = True
    return jsonify({"status": "started"})

@app.route("/stop")
def stop():
    global detection_running
    detection_running = False
    return jsonify({"status": "stopped"})

@app.route("/capture")
def capture():
    global last_frame_bgr
    if last_frame_bgr is not None:
        filename = os.path.join(BASE_DIR, "captures", f"{int(time.time())}.jpg")
        cv2.imwrite(filename, last_frame_bgr)
        return jsonify({"status": "saved", "file": filename})
    return jsonify({"status": "no frame"})

# ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    app.run(debug=True, threaded=True)