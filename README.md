# ♻️ EcoVision AI - Real-Time Waste & Plastic Classification System

EcoVision AI is a real-time object detection and waste classification web application built using **Python, Flask, YOLO (Ultralytics), OpenCV, HTML5, CSS3, JavaScript, and Bootstrap 5**. The application captures live video feed from a webcam, performs high-precision object detection, automatically categorizes detected items into **Degradable** and **Non-Degradable** waste, filters out human detections, and renders smooth client-side bounding box overlays on a modern dashboard.

---

## 📌 Features

- 🎥 **Real-time Webcam Streaming**: Low-latency camera streaming processed asynchronously.
- 🤖 **YOLO AI Detection**: High-accuracy object detection powered by Ultralytics YOLO (`yolo26x.pt` / `yolov8`).
- ♻️ **Automated Waste Classification**: Real-time classification into **Degradable** (organic/paper) and **Non-Degradable** (plastics/metals/electronics) categories.
- 👤 **Smart Noise Filtering**: Excludes human (`person`) detections to focus exclusively on waste items.
- 🎯 **Smooth Canvas Overlay**: Client-side rendering of normalized bounding boxes and confidence scores.
- 📊 **Live Analytics**: Real-time counters for total objects, degradable items, and non-degradable items.
- ▶️ **Start / Stop Controls**: Easily toggle detection state from the UI dashboard.
- 📷 **Snapshot Capture**: Save annotated detection frames directly to the `captures/` folder.
- 📱 **Responsive UI Dashboard**: Sleek and modern dashboard styled with Bootstrap 5 and custom CSS.

---

## 🛠 Technologies Used

### Frontend
- **HTML5** & **CSS3**
- **Bootstrap 5** (Responsive layout & UI components)
- **JavaScript (ES6+)** & **HTML5 Canvas API** (Dynamic video overlay & API communication)

### Backend
- **Python 3.10+**
- **Flask** (REST API & WSGI web application)
- **OpenCV (`cv2`)** (Frame decoding & image processing)
- **NumPy** (Buffer manipulation)

### AI / Machine Learning
- **Ultralytics YOLO** (`yolo26x.pt` / `yolov8n.pt` / `yolov8s.pt`)

---

## 📂 Project Structure

```
EcoVision-Plastic-Detection-main/
│
├── yolo26x.pt                       # YOLO Extra-Large Model weights (root level)
├── README.md                        # Documentation
│
└── Waste_Detection_project/         # Core Application Directory
    ├── app.py                       # Flask server & YOLO inference backend
    ├── yolov8n.pt                   # YOLO Nano model weights
    ├── yolov8s.pt                   # YOLO Small model weights
    │
    ├── captures/                    # Stored frame snapshots
    │
    ├── templates/
    │   └── index.html               # Web Dashboard UI template
    │
    └── static/
        ├── css/
        │   └── style.css            # Custom CSS styling
        └── js/
            └── app.js               # Webcam capture & canvas rendering JS logic
```

---

## ⚙️ Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/EcoVision-Plastic-Detection.git
cd EcoVision-Plastic-Detection-main/Waste_Detection_project
```

---

### 2. Create and Activate Virtual Environment

**On macOS / Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

**On Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

---

### 3. Install Dependencies

Install the required Python packages:

```bash
pip install flask ultralytics opencv-python numpy
```

---

### 4. Model Weights Setup

Ensure the required YOLO model file (e.g., `yolo26x.pt`, `yolov8n.pt`, or `yolov8s.pt`) is present in the workspace directory specified in `app.py`.

---

### 5. Run the Application

Start the Flask server from the `Waste_Detection_project` folder:

```bash
python app.py
```

---

### 6. Access the Dashboard

Open your web browser and navigate to:

```
http://127.0.0.1:5000
```

---

## ⚙️ API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Renders the main dashboard interface (`index.html`) |
| `POST` | `/detect` | Receives base64 frame, executes YOLO inference, returns normalized boxes & classification statistics |
| `GET` | `/start` | Resumes active object detection |
| `GET` | `/stop` | Pauses active object detection |
| `GET` | `/capture` | Saves the most recent detection frame as a JPEG image in `captures/` |

---

## 🏷 Waste Category Mapping

The backend maps detected COCO object classes into two main environmental categories:

### 🟢 Degradable Waste
- **Organic & Food Items**: Banana, Apple, Sandwich, Orange, Broccoli, Carrot, Hot Dog, Pizza, Donut, Cake, Food
- **Natural Materials**: Leaf, Paper, Book

### 🔴 Non-Degradable Waste (Plastics, Metals, Electronics, Synthetic Items)
- **Containers & Utensils**: Bottle, Wine Glass, Cup, Fork, Knife, Spoon, Bowl
- **Electronics & Appliances**: Laptop, Mouse, Remote, Keyboard, Cell Phone, Microwave, Oven, Toaster, Refrigerator, TV, Clock
- **Personal & Household Items**: Scissors, Toothbrush, Hair Drier, Vase, Umbrella, Backpack, Handbag, Suitcase
- **Vehicles & Infrastructure**: Car, Motorcycle, Airplane, Bus, Train, Truck, Boat, Bicycle, Traffic Light, Stop Sign, Parking Meter, Bench, Chair, Couch, Dining Table, Bed, Toilet
- **Sports & Miscellaneous**: Frisbee, Sports Ball, Kite, Skateboard, Surfboard, Tennis Racket, Baseball Bat, Baseball Glove, Potted Plant, Tie

### 🚫 Excluded Labels
- `person`, `people` are automatically skipped to prevent classifying individuals as waste.

---

## 🔮 Future Enhancements

- 🏷️ Custom dataset training specifically for plastic waste sub-types (PET, HDPE, LDPE, PP, PS).
- 📍 DeepSORT / ByteTrack integration for individual object tracking and deduplication.
- 🗄️ Database integration (SQLite / PostgreSQL) to record historical detection analytics.
- 📈 Advanced analytics dashboard with charts & downloadable CSV/PDF reports.
- ☁️ Deployment options for edge devices (Raspberry Pi, NVIDIA Jetson) and cloud hosting.

---

## 📄 License

This project is open-source and intended for educational, research, and environmental sustainability initiatives.

---

## 👨‍💻 Author

**Vaithyanadhan S G**  
*Department of Artificial Intelligence and Data Science*  
K. Ramakrishnan College of Technology

---

## ⭐ Acknowledgements

- [Ultralytics YOLOv8](https://github.com/ultralytics/ultralytics)
- [Flask Web Framework](https://flask.palletsprojects.com/)
- [OpenCV](https://opencv.org/)
- [Bootstrap 5](https://getbootstrap.com/)

