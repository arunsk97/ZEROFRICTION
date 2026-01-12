// --- GLOBAL VARIABLES FOR STATE ---
let currentWeight = 140;
let currentHeight = 184;
let currentAge = 30;
let bmiChartInstance = null;
let calorieChartInstance = null;
let strengthChartInstance = null;

// --- GEMINI API INTEGRATION ---
async function generateGeminiContent(systemPrompt, userPrompt, resultDivId) {
    const apiKey = document.getElementById('apiKeyInput').value.trim();
    const resultDiv = document.getElementById(resultDivId);

    if (!apiKey) {
        resultDiv.classList.remove('hidden');
        resultDiv.innerHTML = '<span class="text-red-400">Error: Please enter your Google Gemini API Key in the top navigation bar.</span>';
        return;
    }

    // Show Loading
    resultDiv.classList.remove('hidden');
    resultDiv.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    // Inject context into system prompt
    const context = `Context: User is ${currentWeight}kg, ${currentHeight}cm tall, software engineer. `;
    const finalSystemPrompt = context + systemPrompt;

    const payload = {
        contents: [{
            parts: [{ text: userPrompt }]
        }],
        systemInstruction: {
            parts: [{ text: finalSystemPrompt }]
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
        
        // Parse Markdown
        resultDiv.innerHTML = marked.parse(rawText);

    } catch (error) {
        console.error(error);
        resultDiv.innerHTML = `<span class="text-red-400">Connection Failed: ${error.message}. Check your API Key.</span>`;
    }
}

function callGeminiFood() {
    const input = document.getElementById('foodInput').value;
    if(!input) return;
    const systemPrompt = "You are a pragmatic nutritionist for a 'lazy software engineer' who hates cooking. Your goal is to optimize takeout orders. The user provides a food item or restaurant order. You must Output a 'Refactored Patch': a specific modification to the order to make it higher protein, lower calorie, and moderate carb (e.g., 'Swap bun for lettuce wrap'). Use developer terminology (e.g., 'Deprecated', 'Refactor', 'Optimization'). Keep it short, punchy, and under 60 words.";
    generateGeminiContent(systemPrompt, input, 'foodResult');
}

function callGeminiFitness() {
    const input = document.getElementById('fitnessInput').value;
    if(!input) return;
    const systemPrompt = "You are an expert strength coach specializing in biomechanics and injury prevention for sedentary office workers. The user describes a pain or form issue. Output a 'Debug Log': 3 bullet points on how to fix the form or alleviate the pain immediately. Focus on safety and simple cues. Use tech/engineering metaphors. Keep it under 60 words.";
    generateGeminiContent(systemPrompt, input, 'fitnessResult');
}


// --- DYNAMIC LOGIC ---

function updateSystemData() {
    // 1. Get Values
    currentWeight = parseFloat(document.getElementById('inputWeight').value) || 140;
    currentHeight = parseFloat(document.getElementById('inputHeight').value) || 184;
    currentAge = parseFloat(document.getElementById('inputAge').value) || 30;

    // 2. Calculate BMI
    // BMI = kg / m^2
    const heightM = currentHeight / 100;
    const bmi = (currentWeight / (heightM * heightM)).toFixed(1);

    // 3. Calculate BMR (Mifflin-St Jeor for Men - assuming male default for simplicity in this persona)
    // BMR = 10W + 6.25H - 5A + 5
    const bmr = Math.round((10 * currentWeight) + (6.25 * currentHeight) - (5 * currentAge) + 5);
    
    const sedentaryBurn = Math.round(bmr * 1.2);
    const junkIntake = Math.round(bmr * 1.6); // Assumption for bad diet
    const targetIntake = Math.round(bmr * 1.2 - 300); // Slight deficit
    const activeBurn = Math.round(bmr * 1.4);

    // 4. Update UI Texts
    let statusText = "OPTIMAL";
    let statusColor = "#10b981"; // Green

    if (bmi > 25) { statusText = "OVERLOADED"; statusColor = "#fbbf24"; }
    if (bmi > 30) { statusText = "SYSTEM WARNING"; statusColor = "#f59e0b"; }
    if (bmi > 35) { statusText = "CRITICAL LOAD"; statusColor = "#ef4444"; }
    if (bmi > 40) { statusText = "SYSTEM FAILURE IMMINENT"; statusColor = "#881337"; }

    document.getElementById('systemStatusText').innerText = statusText;
    document.getElementById('systemStatusText').style.color = statusColor;
    document.getElementById('bmiSubtitle').innerHTML = `Current System Status: <span style="color:${statusColor}; font-weight:bold">BMI ${bmi} (${statusText})</span>`;
    
    document.getElementById('calorieInsight').innerText = `Your baseline hardware requires ~${bmr} kcal just to idle. Currently, you burn ~${sedentaryBurn} kcal/day. To refactor your weight, target ~${targetIntake} kcal/day.`;

    // Update warning texts based on weight
    if (currentWeight > 120) {
        document.getElementById('cardioText').innerText = `At ${currentWeight}kg, your heart is compiling complex queries 24/7. Resting Heart Rate is likely elevated.`;
        document.getElementById('jointText').innerText = `At ${currentWeight}kg, impact forces are high. Running is deprecated. Stick to low-impact torque.`;
    } else {
        document.getElementById('cardioText').innerText = `At ${currentWeight}kg, cardiovascular load is moderate. Focus on increasing efficiency.`;
        document.getElementById('jointText').innerText = `At ${currentWeight}kg, you are cleared for moderate impact, but prioritize form first.`;
    }

    // 5. Update Charts
    updateBMIChart(bmi);
    updateCalorieChart(junkIntake, sedentaryBurn, targetIntake, activeBurn);
    updateStrengthChart(); // Mostly visual re-render
}

// --- CHART FUNCTIONS ---

function updateBMIChart(bmiVal) {
    const bmi = parseFloat(bmiVal);
    // Create data where "Your BMI" is a slice proportional to the value, 
    // but for a gauge we often just want color segments.
    // Let's keep the segments static but update the title.
    
    if (bmiChartInstance) bmiChartInstance.destroy();

    const bmiCtx = document.getElementById('bmiGauge').getContext('2d');
    bmiChartInstance = new Chart(bmiCtx, {
        type: 'doughnut',
        data: {
            labels: ['Normal (18-25)', 'Overweight (25-30)', 'Obese (30+)', 'Your Position'],
            datasets: [{
                data: [25, 15, 60], // Standard distribution roughly
                backgroundColor: ['#10b981', '#fbbf24', '#ef4444'],
                borderWidth: 0,
                circumference: 180,
                rotation: 270,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: { display: true, position: 'bottom', labels: {boxWidth: 10, color:'#ccc'} },
                tooltip: { enabled: false },
                title: {
                    display: true,
                    text: `BMI: ${bmi}`,
                    color: '#fff',
                    font: { size: 24, weight: 'bold' },
                    padding: { bottom: 10 }
                }
            }
        }
    });
}

function updateCalorieChart(junk, currentBurn, targetIn, activeBurn) {
    if (calorieChartInstance) calorieChartInstance.destroy();

    const calCtx = document.getElementById('calorieChart').getContext('2d');
    calorieChartInstance = new Chart(calCtx, {
        type: 'bar',
        data: {
            labels: ['Current Intake', 'Current Burn', 'Target Intake', 'Target Burn'],
            datasets: [{
                label: 'Calories (kcal)',
                data: [junk, currentBurn, targetIn, activeBurn],
                backgroundColor: [
                    'rgba(239, 68, 68, 0.8)', // Red
                    'rgba(107, 114, 128, 0.8)', // Gray
                    'rgba(6, 182, 212, 0.8)', // Cyan
                    'rgba(59, 130, 246, 0.8)'  // Blue
                ],
                borderColor: [
                    '#ef4444', '#6b7280', '#06b6d4', '#3b82f6'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                     callbacks: {
                        title: function(tooltipItems) {
                            const item = tooltipItems[0];
                            return item.chart.data.labels[item.dataIndex];
                        }
                    }
                }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

function updateStrengthChart() {
    if (strengthChartInstance) strengthChartInstance.destroy();

    const strengthCtx = document.getElementById('strengthChart').getContext('2d');
    const weeks = ['Week 1', 'Week 4', 'Week 8', 'Week 12', 'Week 16'];
    strengthChartInstance = new Chart(strengthCtx, {
        type: 'line',
        data: {
            labels: weeks,
            datasets: [{
                label: 'Workout Consistency %',
                data: [20, 50, 70, 85, 95], 
                borderColor: '#06b6d4',
                backgroundColor: 'rgba(6, 182, 212, 0.2)',
                fill: true,
                tension: 0.4
            }, {
                label: 'Perceived Effort',
                data: [80, 60, 50, 40, 30], 
                borderColor: '#f472b6',
                borderDash: [5, 5],
                tension: 0.4,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                 tooltip: {
                     callbacks: {
                        title: function(tooltipItems) {
                            return tooltipItems[0].label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: { display: true, text: 'Percentage' }
                }
            }
        }
    });
}

// --- INIT ---

// Plotly Static Chart (Food Matrix)
var trace1 = {
    x: [9, 8, 2], 
    y: [2, 3, 9], 
    mode: 'markers+text',
    type: 'scatter',
    name: 'Food Types',
    text: ['Pizza/Burgers', 'Fries/Soda', 'Salads/Proteins'],
    textposition: 'top center',
    marker: { size: [30, 25, 35], color: ['#ef4444', '#f59e0b', '#06b6d4'] }
};

var layout = {
    title: 'The Food Matrix',
    xaxis: { title: 'Calorie Density (Bad)', range: [0, 10] },
    yaxis: { title: 'Satiety / Fullness (Good)', range: [0, 10] },
    margin: { t: 40, b: 40, l: 40, r: 40 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    showlegend: false
};

document.getElementById('nutritionScatter').style.display = 'none'; 
var plotlyDiv = document.createElement('div');
plotlyDiv.style.width = '100%';
plotlyDiv.style.height = '100%';
document.getElementById('nutritionScatter').parentElement.appendChild(plotlyDiv);
Plotly.newPlot(plotlyDiv, [trace1], layout, {responsive: true, displayModeBar: false});

// Run Initial Update
updateSystemData();