import re

with open('app.py', 'r') as f:
    content = f.read()

# 1. Update active_models default to just the first model (or the most important one) to save inference time.
# Let's change the default to [3] since yolov8n-waste-12cls-best.pt is the most specific.
content = content.replace('active_models = data.get("active_models", [0, 1, 2, 3]) # defaults to all models',
                          'active_models = data.get("active_models", [3]) # defaults to only the 12-class model to save time')

# 2. Update /api/models to include classes
api_logic = """
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
"""

content = re.sub(r'@app.route\("/api/models"\)\ndef get_models\(\):.*?return jsonify\(model_list\)', api_logic.strip(), content, flags=re.DOTALL)

with open('app.py', 'w') as f:
    f.write(content)
