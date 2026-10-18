import re

with open('static/js/app.js', 'r') as f:
    content = f.read()

# Make sure log entry is ALWAYS added when objects are detected, not just when voice changes.
# In updateUI:
log_logic = """
    const changed = category !== lastCategory || label !== lastLabel;
    
    // Always log to history if it's a valid object
    if (changed && objects > 0) {
        addLogEntry(category, label, confidence);
    }

    if (changed && cfg.voice && objects > 0) {
        speak(cfg.voice(label));
        lastCategory = category;
        lastLabel    = label;
    }
"""
content = re.sub(
    r'const changed = category !== lastCategory \|\| label !== lastLabel;\s+if \(changed && cfg\.voice && objects > 0\) \{.*?lastLabel\s+=\s+label;\s+\}', 
    log_logic.strip(), 
    content, 
    flags=re.DOTALL
)

with open('static/js/app.js', 'w') as f:
    f.write(content)
