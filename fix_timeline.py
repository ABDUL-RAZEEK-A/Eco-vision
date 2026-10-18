import re

with open('static/js/app.js', 'r') as f:
    content = f.read()

# 1. Update the state variables
content = content.replace('let timelineData = [];', 
                          'let timelineDataDeg = [];\nlet timelineDataNonDeg = [];')

# 2. Update the chart initialization
chart_logic = """
    // 2. Timeline Line Chart
    const ctxTime = document.getElementById('timelineChart')?.getContext('2d');
    if (ctxTime) {
        timelineChartInstance = new Chart(ctxTime, {
            type: 'line',
            data: {
                labels: timelineLabels,
                datasets: [
                    {
                        label: 'Total Degradable',
                        data: timelineDataDeg,
                        borderColor: '#00e676',
                        backgroundColor: 'rgba(0, 230, 118, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Total Non-Degradable',
                        data: timelineDataNonDeg,
                        borderColor: '#ff1744',
                        backgroundColor: 'rgba(255, 23, 68, 0.1)',
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });

        // Start a ticker to update timeline every 1 minute (60000ms)
        setInterval(() => {
            const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
            timelineLabels.push(now);
            
            // Plot the cumulative total of objects detected so far
            timelineDataDeg.push(logBioCount);
            timelineDataNonDeg.push(logNonBioCount);
            
            if (timelineLabels.length > 20) {
                timelineLabels.shift();
                timelineDataDeg.shift();
                timelineDataNonDeg.shift();
            }
            if (timelineChartInstance) timelineChartInstance.update('none');
        }, 60000);
    }
"""

content = re.sub(r'// 2\. Timeline Line Chart.*?}, 5000\);\n    }', chart_logic.strip(), content, flags=re.DOTALL)

with open('static/js/app.js', 'w') as f:
    f.write(content)
