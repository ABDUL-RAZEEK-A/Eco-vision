import re

# Update app.py
with open('app.py', 'r') as f:
    content = f.read()

content = content.replace('active_models = data.get("active_models", [3]) # defaults to only the 12-class model to save time',
                          'active_models = data.get("active_models", [0]) # defaults to yolov8n.pt')

with open('app.py', 'w') as f:
    f.write(content)

# Update app.js
with open('static/js/app.js', 'r') as f:
    js_content = f.read()

js_content = js_content.replace('let activeModels = [3]; // Default to only the specific waste model for performance',
                                'let activeModels = [0]; // Default to yolov8n.pt only')

with open('static/js/app.js', 'w') as f:
    f.write(js_content)
