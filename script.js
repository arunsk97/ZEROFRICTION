// --- GLOBAL VARIABLES ---
let currentWeight = 140;
let currentHeight = 184;
let currentAge = 30;
let isVegetarian = false;
let bmiChartInstance = null;
let calorieChartInstance = null;
let strengthChartInstance = null;

// --- GEMINI API CALLER ---
async function generateGeminiContent(systemPrompt, userPrompt, resultDivId) {
    const apiKey = document.getElementById('apiKeyInput').value.trim();
    const resultDiv = document.getElementById(resultDivId);

    if (!apiKey) {
        resultDiv.classList.remove('hidden');
        resultDiv.innerHTML = '<span class="text-red-400 font-bold">Error: API Key Missing. Please enter it in Section 05 above.</span>';
        return;
    }

    // Show Loading
    resultDiv.classList.remove('hidden');
    resultDiv.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    // Inject context
    const dietContext = isVegetarian ? "User is Vegetarian. " : "User eats meat. ";
    const context = `Context: User is ${currentWeight}kg, ${currentHeight}cm tall, software engineer. ${dietContext}`;
    const finalSystemPrompt = context + systemPrompt;

    const payload = {
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: finalSystemPrompt }] }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`API Error: ${response.status}`);

        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
        resultDiv.innerHTML = marked.parse(rawText);

    } catch (error) {
        console.error(error);
        resultDiv.innerHTML = `<span class="text-red-400">Connection Failed: ${error.message}</span>`;
    }
}

// --- SPECIFIC WRAPPERS ---
function callGeminiFood() {
    const input = document.getElementById('foodInput').value;
    if(!input) return;
    const systemPrompt = "You are a pragmatic nutritionist for a 'lazy software engineer' who hates cooking. User provides a junk food order. Output a 'Refactored Patch': a specific modification to make it higher protein, lower calorie. Suggest vegetarian protein swaps if context implies. Use dev terminology. Keep it under 60 words.";
    generateGeminiContent(systemPrompt, input, 'foodResult');
}

function callGeminiFitness() {
    const input = document.getElementById('fitnessInput').value;
    if(!input) return;
    const systemPrompt = "Expert strength coach for sedentary engineers. User describes pain/form. Output 'Debug Log': 3 bullet points to fix form/alleviate pain. Focus on safety. Use tech metaphors. Keep it under 60 words.";
    generateGeminiContent(systemPrompt, input, 'fitnessResult');
}


// --- MAIN SYSTEM LOGIC ---
function updateSystemData() {
    // 1. Get Values
    const wInput = document.getElementById('inputWeight').value;
    const hInput = document.getElementById('inputHeight').value;
    const aInput = document.getElementById('inputAge').value;
    
    if (!wInput || !hInput) {
        alert("Please enter Weight and Height.");
        return;
    }

    currentWeight = parseFloat(wInput);
    currentHeight = parseFloat(hInput);
    currentAge = parseFloat(aInput) || 30;
    isVegetarian = document.getElementById('inputDiet').value === 'veg';

    // 2. Reveal Dashboard
    const contentDiv = document.getElementById('dashboard-content');
    contentDiv.classList.remove('hidden');
    
    // Scroll to start of content
    setTimeout(() => {
        contentDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Fade in sections
        document.querySelectorAll('.fade-in-section').forEach(sec => sec.classList.add('is-visible'));
    }, 100);

    // 3. Update Dynamic Text
    updateDynamicText();

    // 4. Calculations
    const heightM = currentHeight / 100;
    const bmi = (currentWeight / (heightM * heightM)).toFixed(1);
    const bmr = Math.round((10 * currentWeight) + (6.25 * currentHeight) - (5 * currentAge) + 5);
    const sedentaryBurn = Math.round(bmr * 1.2);
    const junkIntake = Math.round(bmr * 1.6);
    const targetIntake = Math.round(bmr * 1.2 - 300);
    const activeBurn = Math.round(bmr * 1.4);

    // 5. Update Status UI
    updateStatusUI(bmi, bmr, sedentaryBurn, targetIntake);

    // 6. Init Charts with small delay to ensure container visibility
    setTimeout(() => {
        updateBMIChart(bmi);
        updateCalorieChart(junkIntake, sedentaryBurn, targetIntake, activeBurn);
        updateStrengthChart(); 
        initPlotly();
    }, 200);
}

function updateDynamicText() {
    // Diet Texts
    if (isVegetarian) {
        document.getElementById('foodOptimized').innerText = "Plant-Based Proteins";
        document.getElementById('foodOptimizedDesc').innerText = "Tofu, Lentils, Chickpeas, Edamame, Tempeh.";
        document.getElementById('foodRuleDesc').innerText = "Rule: Double the beans/tofu, reduce the rice.";
        document.getElementById('lunchDesc').innerHTML = `<strong>Order:</strong> Chipotle (Sofritas, extra beans, fajita veg, guac) OR Sweetgreen (Tofu/Eggs + Beans).`;
        document.getElementById('dinnerDesc').innerText = `Order: Grilled Tofu/Paneer/Tempeh + Veggies. Keep carbs low.`;
    } else {
        document.getElementById('foodOptimized').innerText = "Grilled / Roasted Proteins";
        document.getElementById('foodOptimizedDesc').innerText = "Double Chicken/Steak, Grilled Fish, Tandoori.";
        document.getElementById('foodRuleDesc').innerText = "Rule: Double Meat, No Rice, Extra Veg.";
        document.getElementById('lunchDesc').innerHTML = `<strong>Order:</strong> Chipotle (No rice, double chicken, guac) OR Sweetgreen (Double protein).`;
        document.getElementById('dinnerDesc').innerText = `Order: Grilled Chicken/Steak + Veggies. Keep carbs low.`;
    }

    // Health Warnings
    if (currentWeight > 120) {
        document.getElementById('cardioText').innerText = `At ${currentWeight}kg, resting Heart Rate is likely elevated. Efficiency is low.`;
        document.getElementById('jointText').innerText = `At ${currentWeight}kg, impact forces are dangerous. Running is DEPRECATED.`;
    } else {
        document.getElementById('cardioText').innerText = `At ${currentWeight}kg, load is moderate. Focus on endurance.`;
        document.getElementById('jointText').innerText = `At ${currentWeight}kg, moderate impact allowed, but prioritize form.`;
    }
}

function updateStatusUI(bmi, bmr, sedentaryBurn, targetIntake) {
    let statusText = "OPTIMAL";
    let statusColor = "#10b981"; 

    if (bmi > 25) { statusText = "OVERLOADED"; statusColor = "#fbbf24"; }
    if (bmi > 30) { statusText = "SYSTEM WARNING"; statusColor = "#f59e0b"; }
    if (bmi > 35) { statusText = "CRITICAL LOAD"; statusColor = "#ef4444"; }
    if (bmi > 40) { statusText = "SYSTEM FAILURE"; statusColor = "#881337"; }

    const statusEl = document.getElementById('systemStatusText');
    statusEl.innerText = statusText;
    statusEl.className = "font-bold font-mono";
    statusEl.style.color = statusColor;

    document.getElementById('bmiSubtitle').innerHTML = `Current Status: <span style="color:${statusColor}; font-weight:bold">BMI ${bmi} (${statusText})</span>`;
    document.getElementById('calorieInsight').innerText = `Baseline hardware requires ~${bmr} kcal to idle. Current Burn: ~${sedentaryBurn}. Target Intake: ~${targetIntake} kcal.`;
}

// --- CHART CONFIGS (FIXED FOR 'CANVAS IN USE' ERROR) ---
function updateBMIChart(bmi) {
    // Robust check using Chart.getChart() which works in Chart.js 3+
    const existingChart = Chart.getChart("bmiGauge");
    if (existingChart) existingChart.destroy();

    const ctx = document.getElementById('bmiGauge').getContext('2d');
    // No global var assignment needed if we use Chart.getChart() next time
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Normal', 'Overweight', 'Obese', 'You'],
            datasets: [{
                data: [25, 15, 60],
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
            plugins: { legend: { display: false }, tooltip: { enabled: false }, title: { display: true, text: `BMI: ${bmi}`, color: '#fff', font: { size: 24 } } }
        }
    });
}

function updateCalorieChart(junk, current, target, active) {
    const existingChart = Chart.getChart("calorieChart");
    if (existingChart) existingChart.destroy();

    const ctx = document.getElementById('calorieChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Current Intake', 'Current Burn', 'Target Intake', 'Target Burn'],
            datasets: [{
                data: [junk, current, target, active],
                backgroundColor: ['#ef4444', '#6b7280', '#06b6d4', '#3b82f6'],
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

function updateStrengthChart() {
    const existingChart = Chart.getChart("strengthChart");
    if (existingChart) existingChart.destroy();

    const ctx = document.getElementById('strengthChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Week 1', 'Week 4', 'Week 8', 'Week 12', 'Week 16'],
            datasets: [{
                label: 'Consistency',
                data: [20, 50, 70, 85, 95],
                borderColor: '#06b6d4',
                backgroundColor: 'rgba(6, 182, 212, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { max: 100 } }
        }
    });
}

function initPlotly() {
    // Check if Plotly already exists
    if(document.getElementById('nutritionScatterContainer').children.length > 0) return;

    var trace1 = {
        x: [9, 8, 2],
        y: [2, 3, 9],
        mode: 'markers+text',
        type: 'scatter',
        text: ['Junk', 'Fried', 'Optimized'],
        textposition: 'top center',
        marker: { size: [30, 25, 40], color: ['#ef4444', '#f59e0b', '#06b6d4'] }
    };

    var layout = {
        margin: { t: 20, b: 40, l: 40, r: 20 },
        xaxis: { title: 'Calorie Density (Bad)', showgrid: false },
        yaxis: { title: 'Volume (Good)', showgrid: false },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)'
    };

    Plotly.newPlot('nutritionScatterContainer', [trace1], layout, {responsive: true, displayModeBar: false});
}

// Init dummy chart for initial load
// We do this inside a try-catch in case DOM isn't ready, though script is at end of body.
try {
    const existingChart = Chart.getChart("bmiGauge");
    if (existingChart) existingChart.destroy();

    const dummyCtx = document.getElementById('bmiGauge').getContext('2d');
    new Chart(dummyCtx, {
        type: 'doughnut',
        data: { datasets: [{ data: [1], backgroundColor: ['#374151'], borderWidth: 0, circumference: 180, rotation: 270 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { legend: { display: false }, tooltip: { enabled: false } } }
    });
} catch(e) {
    console.log("Waiting for Chart.js init");
}