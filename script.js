// --- CONFIGURATION ---
// Replace with your actual Gemini API Key
const API_KEY = 'AIzaSyBVLErYNmLu65rUTzAw75Dtfqnk2Tz8odk';

// --- STATE ---
let isFullBuild = true;
let isLoading = false;

// --- DOM ELEMENTS ---
const btnFull = document.getElementById('btn-full');
const btnUpgrade = document.getElementById('btn-upgrade');
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const inputGuidance = document.getElementById('input-guidance');
const executeBtn = document.getElementById('execute-btn');
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const resultsDisplay = document.getElementById('results-display');

// --- CONSTANTS ---
const CATEGORY_IMAGES = {
    "CPU": ["https://loremflickr.com/500/300/processor,chip?lock=1"],
    "GPU": ["https://loremflickr.com/500/300/graphicscard,nvidia?lock=10"],
    "RAM": ["https://loremflickr.com/500/300/ram,memory?lock=20"],
    "Motherboard": ["https://loremflickr.com/500/300/motherboard,circuit?lock=30"],
    "Storage": ["https://loremflickr.com/500/300/ssd,harddrive?lock=40"],
    "Case": ["https://loremflickr.com/500/300/pc,case,neon?lock=50"],
    "PSU": ["https://loremflickr.com/500/300/power,supply?lock=60"],
    "Monitor": ["https://loremflickr.com/500/300/monitor,screen?lock=70"]
};

// --- UTILS ---
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount);
}

function getImageForPart(type, name) {
    let key = "Case";
    const lowerType = type.toLowerCase();

    if (lowerType.includes("cpu") || lowerType.includes("processor")) key = "CPU";
    else if (lowerType.includes("gpu") || lowerType.includes("graphics")) key = "GPU";
    else if (lowerType.includes("ram") || lowerType.includes("memory")) key = "RAM";
    else if (lowerType.includes("board")) key = "Motherboard";
    else if (lowerType.includes("ssd") || lowerType.includes("hdd") || lowerType.includes("storage")) key = "Storage";
    else if (lowerType.includes("supply") || lowerType.includes("psu")) key = "PSU";
    else if (lowerType.includes("monitor")) key = "Monitor";
    else if (lowerType.includes("case") || lowerType.includes("chassis")) key = "Case";

    const images = CATEGORY_IMAGES[key] || CATEGORY_IMAGES["Case"];
    const charSum = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return images[charSum % images.length];
}

// --- LOGIC ---
function toggleBuildType(type) {
    isFullBuild = (type === 'full');

    if (isFullBuild) {
        btnFull.classList.add('active');
        btnUpgrade.classList.remove('active');
        inputGuidance.textContent = "INPUT PARAMETERS: Budget? Usage (Gaming/Editing)? Preferences?";
    } else {
        btnUpgrade.classList.add('active');
        btnFull.classList.remove('active');
        inputGuidance.textContent = "INPUT SCENARIO: Current Spec? What to upgrade?";
    }
}

async function fetchRecommendations(prompt, isFullBuild) {
    const activeKey = API_KEY || localStorage.getItem('GEMINI_API_KEY');

    if (!activeKey) {
        throw new Error("API Key not found. Please set API_KEY in script.js or provide it when prompted.");
    }

    const aiPrompt = `
    You are a PC Hardware Expert. 
    Task: Recommend a PC ${isFullBuild ? "full build" : "upgrade"} based on this user request: "${prompt}".
    Analyze if the user needs a Gaming Rig, Workstation, or General Use PC and tailor parts accordingly.
    
    CONSTRAINTS:
    1. Always use Indian Rupees (₹) for prices. If you find prices in USD, convert them to INR (approx 1 USD = 85 INR).
    2. Calculate compatibility (Socket, Wattage, Physical size).
    3. Output ONLY a valid JSON object. Do not include markdown formatting (like \`\`\`json).
    4. Adhere to this exact JSON schema:
    {
      "build_name": "Creative Title string",
      "total_price_inr": number,
      "parts": [
        {
          "type": "Component Type (e.g., CPU, GPU)",
          "name": "Exact Part Name",
          "price_inr": number,
          "image_url": "https://source.unsplash.com/featured/?computer,hardware", 
          "reasoning": "High performance for requested tasks."
        }
      ],
      "compatibility_notes": "Important warnings or confirmation of fit."
    }
  `;

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${activeKey}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: aiPrompt }] }],
            }),
        }
    );

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "API request failed");
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    const cleanJson = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanJson);
}

function renderResults(data) {
    resultsDisplay.innerHTML = '';

    if (!data) return;

    const { build_name, total_price_inr, parts, compatibility_notes } = data;

    // Header Panel
    const headerPanel = document.createElement('div');
    headerPanel.className = 'glass-panel summary-panel';
    headerPanel.innerHTML = `
        <h2>${build_name}</h2>
        <div style="font-size: 1.5rem; color: #fff;">Est. Total: ${formatCurrency(total_price_inr)}</div>
        ${compatibility_notes ? `
            <div style="margin-top: 1rem; color: #ff4444; border-top: 1px solid var(--tech-gold-dim); padding-top: 0.5rem;">
                ⚠ SYSTEM NOTE: ${compatibility_notes}
            </div>
        ` : ''}
    `;
    resultsDisplay.appendChild(headerPanel);

    // Grid
    const grid = document.createElement('div');
    grid.className = 'parts-grid';

    parts.forEach(part => {
        const card = document.createElement('div');
        card.className = 'glass-panel part-card';

        card.innerHTML = `
            <div class="part-image-container">
                <div class="part-image-overlay-1"></div>
                <div class="part-image-overlay-2"></div>
                <img 
                    src="${getImageForPart(part.type, part.name)}" 
                    alt="${part.name}" 
                    class="part-image"
                    onerror="this.onerror=null; this.src='https://loremflickr.com/500/300/computer,tech';"
                >
            </div>
            <div class="part-details">
                <div class="part-type">${part.type}</div>
                <h3 class="part-name">${part.name}</h3>
                <div class="part-price">${formatCurrency(part.price_inr)}</div>
                <div class="part-reasoning">
                    <span class="reasoning-label">Analysis: </span>
                    ${part.reasoning}
                </div>
            </div>
        `;
        grid.appendChild(card);
    });

    resultsDisplay.appendChild(grid);
}

// --- EVENTS ---
btnFull.addEventListener('click', () => toggleBuildType('full'));
btnUpgrade.addEventListener('click', () => toggleBuildType('upgrade'));

searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const prompt = searchInput.value.trim();
    if (!prompt || isLoading) return;

    // Reset UI
    isLoading = true;
    executeBtn.disabled = true;
    executeBtn.textContent = 'SCANNING...';
    loadingState.style.display = 'block';
    errorState.style.display = 'none';
    resultsDisplay.innerHTML = '';

    try {
        const result = await fetchRecommendations(prompt, isFullBuild);
        renderResults(result);
    } catch (err) {
        console.error(err);
        errorState.style.display = 'block';
        errorState.textContent = `ERROR: ${err.message}`;
    } finally {
        isLoading = false;
        executeBtn.disabled = false;
        executeBtn.textContent = 'EXECUTE';
        loadingState.style.display = 'none';
    }
});

// Optional: Prompt for API Key if not set
window.addEventListener('load', () => {
    if (!API_KEY && !localStorage.getItem('GEMINI_API_KEY')) {
        const key = prompt("Please enter your Gemini API Key to use PartPickr Lab:");
        if (key) {
            localStorage.setItem('GEMINI_API_KEY', key);
        }
    }
});





