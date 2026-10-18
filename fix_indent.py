import re

with open('app.py', 'r') as f:
    content = f.read()

# Fix the indentation of the processing block inside the boxes loop
bad_code = """
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
"""

good_code = """
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
"""
content = content.replace(bad_code, good_code)

with open('app.py', 'w') as f:
    f.write(content)
