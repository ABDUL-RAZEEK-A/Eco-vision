import re

with open('static/js/app.js', 'r') as f:
    content = f.read()

# 1. Change default active models
content = content.replace('let activeModels = [0, 1, 2, 3]; // Default to all', 
                          'let activeModels = [3]; // Default to only the specific waste model for performance')

# 2. Add classes text to settings UI
classes_html = """
                <div class="model-info">
                    <h4>${m.name}</h4>
                    <p class="text-muted" style="font-size: 0.9rem; margin:0; margin-bottom: 4px;">${m.desc}</p>
                    <p class="text-muted" style="font-size: 0.8rem; margin:0; color: var(--accent-primary);"><strong>Detects:</strong> ${m.classes}</p>
                </div>
"""
content = re.sub(r'<div class="model-info">.*?</div>', classes_html.strip(), content, flags=re.DOTALL)

with open('static/js/app.js', 'w') as f:
    f.write(content)
