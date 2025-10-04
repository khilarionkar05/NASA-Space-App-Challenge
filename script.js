// =================================================================
//     FIREBASE CONFIGURATION
// =================================================================
const firebaseConfig = {
  apiKey: "AIzaSyBHj5_a3ZCb0cHMgUJ1Z_vHAvkZt-1JSBQ",
  authDomain: "bloom-watch-web.firebaseapp.com",
  projectId: "bloom-watch-web",
  storageBucket: "bloom-watch-web.firebasestorage.app",
  messagingSenderId: "1060772079301",
  appId: "1:1060772079301:web:6a880d4a09904c876fb2ac"
};


// =================================================================
//   INITIALIZE FIREBASE AND FIRESTORE
// =================================================================
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage(); // For image upload

// =================================================================
//    MAP SETUP AND LAYERS
// =================================================================
const southWest = L.latLng(-90, -180);
const northEast = L.latLng(90, 180);
const bounds = L.latLngBounds(southWest, northEast);

const map = L.map('map', {
    
    maxBounds: bounds,
    
    minZoom: 2 
}).setView([20.5937, 78.9629], 5);

const openStreetMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; and the GIS User Community'
}).addTo(map);

const geeNdviiLayerUrl = 'https://earthengine.googleapis.com/v1/projects/space-app-473412/maps/37ee5fa4aab2de6a44009ffe4399c68e-65d4a08bf7fe88af08dc010d676d9f87/tiles/{z}/{x}/{y}';
const ndviLayer = L.tileLayer(geeNdviiLayerUrl, {
    attribution: 'Data from NASA MODIS via Google Earth Engine'
});

const baseMaps = { "Street Map": openStreetMap };

// =================================================================
//      ALL 12 OF YOUR MONTHLY GEE URLs HERE! 
// =================================================================
const monthlyUrls = [
    'https://earthengine.googleapis.com/v1/projects/space-app-473412/maps/45d62e7561b333bcf35b80114df498e6-aa103e0eb0b083fb5a39b1a5193bd340/tiles/{z}/{x}/{y}',
    "https://earthengine.googleapis.com/v1/projects/space-app-473412/maps/ae686d6391f591558881b10894ef05a5-6444b544a55c03ba74318e83347dbf43/tiles/{z}/{x}/{y}",
    "https://earthengine.googleapis.com/v1/projects/space-app-473412/maps/37ee5fa4aab2de6a44009ffe4399c68e-65d4a08bf7fe88af08dc010d676d9f87/tiles/{z}/{x}/{y}",
    "https://earthengine.googleapis.com/v1/projects/space-app-473412/maps/8b19cd23914aaf2600a1c690f0a9c12a-afcbee08a3abcefa1c553d36b2c9ab4c/tiles/{z}/{x}/{y}",
    "https://earthengine.googleapis.com/v1/projects/space-app-473412/maps/2cc6b11ddf2196b247bd8e3bd8158e53-bb084a5e4bebf4fbcd8d241a4f694198/tiles/{z}/{x}/{y}",
    "https://earthengine.googleapis.com/v1/projects/space-app-473412/maps/e6af3727b478a04d4f7a9f45e2f2a102-850669aad78e367d885b8a23bbc429ea/tiles/{z}/{x}/{y}",
    "https://earthengine.googleapis.com/v1/projects/space-app-473412/maps/6ea623023ef4078bcc1c7312dba0ffff-9f5898f9952fcbf7d02d41b6d924b66b/tiles/{z}/{x}/{y}",
    "https://earthengine.googleapis.com/v1/projects/space-app-473412/maps/eb6c4fa69e7d02a12ca190fc69c71a75-cdad2da51a1708721dd3beffd36f5c50/tiles/{z}/{x}/{y}",
    "https://earthengine.googleapis.com/v1/projects/space-app-473412/maps/e82c53a5664e9ae7834627a9ba8ffcfa-09a6f5cfc9485794cbdbc31a9b7e9451/tiles/{z}/{x}/{y}",
    "https://earthengine.googleapis.com/v1/projects/space-app-473412/maps/3c5f8f95251887d8cdef588db59f566b-f4a174635532a2a2868ab4e6e54fdd2d/tiles/{z}/{x}/{y}",
    "https://earthengine.googleapis.com/v1/projects/space-app-473412/maps/4714d9fa7c807497355e192f8185e592-00b03f66742371e8491d96b336eee2d4/tiles/{z}/{x}/{y}",
    "https://earthengine.googleapis.com/v1/projects/space-app-473412/maps/08fbe68b8259a8a59c6b14ddd44a1811-27cce8353f47cd3be84a09f929f4650c/tiles/{z}/{x}/{y}",
    "https://earthengine.googleapis.com/v1/projects/space-app-473412/maps/cff74b0eac160b090810c5823c119e72-6d11a1c054ac63387fa9518e952c27f5/tiles/{z}/{x}/{y}"
];


const monthlyNdviLayers = monthlyUrls.map(url => L.tileLayer(url, { attribution: 'NASA GEE' }));
let currentNdviLayer = null; 

const pinsLayerGroup = L.layerGroup().addTo(map);


const overlayMaps = { "User Sightings": pinsLayerGroup };
L.control.layers(null, overlayMaps).addTo(map);


// =================================================================
//       REFERENCES & GLOBAL VARIABLES
// =================================================================
const playPauseBtn = document.getElementById('play-pause-btn');
const timelineSlider = document.getElementById('timeline-slider');
const timelineLabel = document.getElementById('timeline-label');
const toggleNdviCheckbox = document.getElementById('toggle-ndvi'); 
const flowerFilter = document.getElementById('flowerFilter');
let allPins = []; 
let animationInterval = null;
let legendAdded = false; 


// =================================================================
//    EVENT LISTENERS AND INITIAL LOAD
// =================================================================
playPauseBtn.addEventListener('click', toggleAnimation);
timelineSlider.addEventListener('input', () => {
    if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
        playPauseBtn.textContent = '▶️ Play';
    }
    updateMapForMonth(parseInt(timelineSlider.value));
});


toggleNdviCheckbox.addEventListener('change', () => {
    const currentMonth = parseInt(timelineSlider.value);
    updateMapForMonth(currentMonth);
});

loadPinsFromDatabase();

// =================================================================
//    TIMELINE FUNCTION 
// =================================================================
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function updateMapForMonth(monthIndex) {
    timelineSlider.value = monthIndex;
    timelineLabel.textContent = months[monthIndex];

    pinsLayerGroup.clearLayers();
    allPins.forEach(pin => {
        if (!pin.timestamp) return;
        const pinMonth = new Date(pin.timestamp.seconds * 1000).getMonth();
        const flowerVal = (typeof flowerFilter !== 'undefined' && flowerFilter) ? flowerFilter.value : 'all';
        if (pinMonth === monthIndex &&
            (flowerVal === 'all' || pin.flower === flowerVal)) {
            drawPinOnMap(pin, pin.id);
        }
    });

 
    if (currentNdviLayer && map.hasLayer(currentNdviLayer)) {
        map.removeLayer(currentNdviLayer);
        if (legendAdded) {
            try { map.removeControl(legend); } catch (e) {  }
            legendAdded = false;
        }
    }

    if (toggleNdviCheckbox.checked) {
        currentNdviLayer = monthlyNdviLayers[monthIndex];
        if (currentNdviLayer) {
            currentNdviLayer.addTo(map);

           
            if (!legendAdded) {
                legend.addTo(map);
                legendAdded = true;
            }

            currentNdviLayer.on('load', () => {
                pinsLayerGroup.bringToFront();
            });
        }
    } else {
        if (legendAdded) {
            try { map.removeControl(legend); } catch (e) { }
            legendAdded = false;
        }
    }

    pinsLayerGroup.bringToFront();
}


function toggleAnimation() {
    if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
        playPauseBtn.textContent = '▶️ Play';
    } else {
        playPauseBtn.textContent = '⏸️ Pause';
        if (currentNdviLayer && map.hasLayer(currentNdviLayer)) {
             map.removeLayer(currentNdviLayer);
        }
        openStreetMap.addTo(map);

        animationInterval = setInterval(() => {
            let currentMonth = parseInt(timelineSlider.value);
            let nextMonth = (currentMonth + 1) % 12;
            updateMapForMonth(nextMonth);
        }, 1500);
    }
}

// =================================================================
//    REFERENCES TO HTML ELEMENTS
// =================================================================
const loader = document.getElementById('loader');
const locationButton = document.getElementById('locationButton');
const searchButton = document.getElementById('searchButton');
const searchInput = document.getElementById('searchInput');
let locationMarker; 

// =================================================================
//    EVENT LISTENERS AND INITIAL LOAD (continued)
// =================================================================
locationButton.addEventListener('click', locateUser);
searchButton.addEventListener('click', searchLocation);
searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') searchLocation(); });
flowerFilter.addEventListener('change', filterPins);

ndviLayer.on('loading', () => {
    loader.classList.remove('loader-hidden');
    loader.classList.add('loader-visible');
});
ndviLayer.on('load', () => {
    loader.classList.remove('loader-visible');
    loader.classList.add('loader-hidden');
});

map.on('locationfound', function(e) {
    if (locationMarker) map.removeLayer(locationMarker);
    locationMarker = L.marker(e.latlng).addTo(map).bindPopup("You are here!").openPopup();
    setTimeout(() => { if (locationMarker) map.removeLayer(locationMarker); }, 5000);
});

map.on('locationerror', (e) => alert("Could not find your location."));

map.on('click', function(e) {
    const nearbyPin = getNearbyPin(e.latlng.lat, e.latlng.lng, allPins);
    if (nearbyPin) {
        
    } else {
        showAddNewPopup(e.latlng.lat, e.latlng.lng);
    }
});

loadPinsFromDatabase();

// =================================================================
//     LEGEND CONTROL 
// =================================================================
const legend = L.control({position: 'bottomright'});
legend.onAdd = function (map) {
    const div = L.DomUtil.create('div', 'info legend');
    const colors = ['#d73027', '#fee08b', '#a6d96a', '#66bd63', '#1a9850'];
    const labels = ['Sparse', 'Low', 'Moderate', 'High', 'Very Dense'];
    div.innerHTML += '<div style="font-weight:bold; margin-bottom:6px;">NDVI Legend</div>';
    for (let i = 0; i < colors.length; i++) {
        div.innerHTML += `<div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
            <span style="display:inline-block; width:18px; height:12px; background:${colors[i]}; border:1px solid rgba(0,0,0,0.1)"></span>
            <span style="font-size:13px; color:#222;">${labels[i]}</span>
        </div>`;
    }
    div.style.padding = '8px 10px';
    div.style.background = 'rgba(255,255,255,0.95)';
    div.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
    div.style.borderRadius = '8px';
    div.style.fontFamily = 'Segoe UI, Tahoma, sans-serif';
   return div;
};

// =================================================================
//     FEATURE FUNCTIONS
// =================================================================

function locateUser() {
    map.locate({setView: true, maxZoom: 14});
}

async function searchLocation() {
    const query = searchInput.value;
    if (!query) return alert("Please enter a location.");
    const searchUrl = `https://nominatim.openstreetmap.org/search?q=${query}, India&format=json&limit=1`;
    try {
        const response = await fetch(searchUrl);
        const data = await response.json();
        if (data && data.length > 0) {
            map.flyTo([data[0].lat, data[0].lon], 10);
        } else {
            alert("Location not found.");
        }
    } catch (error) {
        console.error("Search error:", error);
        alert("Problem with search service.");
    }
}

function populateFilter(pins) {
    const flowerNames = [...new Set(pins.map(pin => pin.flower))].sort();
    flowerFilter.innerHTML = '<option value="all">Show All Flowers</option>';
    flowerNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        flowerFilter.appendChild(option);
    });
}

function filterPins() {
    const selectedFlower = flowerFilter.value;
    pinsLayerGroup.clearLayers();
    const pinsToDisplay = (selectedFlower === 'all') ? allPins : allPins.filter(pin => pin.flower === selectedFlower);
    pinsToDisplay.forEach(pin => drawPinOnMap(pin, pin.id));
}
// =================================================================
//      USER SECTION TOGGLES
// =================================================================


const agricultureLayer = L.layerGroup(); 
const invasiveLayer = L.layerGroup();
const pollenRiskLayer = L.layerGroup();

function toggleAgricultureLayer() {
    const checkbox = document.getElementById('toggle-agri');
    if (checkbox.checked) { agricultureLayer.addTo(map); pinsLayerGroup.bringToFront(); } 
    else if (map.hasLayer(agricultureLayer)) { map.removeLayer(agricultureLayer); }
}


function toggleInvasiveLayer() {
    const checkbox = document.getElementById('toggle-invasive');
    if (checkbox.checked) { invasiveLayer.addTo(map); pinsLayerGroup.bringToFront(); } 
    else if (map.hasLayer(invasiveLayer)) { map.removeLayer(invasiveLayer); }
}

/** Toggles the visibility of the Public Health Pollen Risk Layer (Simulated). */
function togglePollenLayer() {
    const checkbox = document.getElementById('toggle-pollen');
    if (checkbox.checked) { pollenRiskLayer.addTo(map); pinsLayerGroup.bringToFront(); } 
    else if (map.hasLayer(pollenRiskLayer)) { map.removeLayer(pollenRiskLayer); }
}
// =================================================================
// 8. GEE DATA & CHART LOGIC (THE ANALYTICAL ENGINE - LIVE API)
// =================================================================

const GEE_LIVE_API_URL = 'https://6f999d9f-48d8-4fe1-96ac-bad2890ace07-00-3qorycqa47cow.pike.repl.co/'; 



async function fetchAndShowChart(lat, lng) {

    const loadingHtml = `
        <div style="text-align: center; padding: 10px;">
            <p>Fetching 20 years of NASA Landsat data...</p>
            <div class="loader-small"></div> 
            <p style="font-size: 0.8em; color: #555;">Querying live Replit API...</p>
        </div>`;
    

    const currentPopupContent = document.querySelector('.leaflet-popup-content');
    if (currentPopupContent) {
        currentPopupContent.innerHTML = loadingHtml;
    } else {
        return; 
    }

    try {
       
        const response = await fetch(`${GEE_LIVE_API_URL}/get_bloom_data?lat=${lat}&lng=${lng}`);
        
        if (!response.ok) {
            let errorText = await response.text();
            throw new Error(`API Error: ${response.status} - ${errorText}`);
        }
        
        
        const apiResponse = await response.json(); 
        const completeData = apiResponse.chartData; 

        if (!completeData.timeseries || completeData.timeseries.length < 5) {
            throw new Error("Received too few clean data points for charting.");
        }

        
        renderChartAndAnomaly(currentPopupContent, completeData, lat, lng);

    } catch (error) {
        console.error("Live Analysis Failed:", error);
        currentPopupContent.innerHTML = `<p style="color: red; text-align: center; padding: 10px;">
                                        Analysis Failed! Ensure Replit API is running. Error: ${error.message}</p>`;
    }
}


function renderChartAndAnomaly(popupElement, completeData, lat, lng) {
    const { timeseries, anomaly } = completeData;
    
    
    const deviation = anomaly.deviation;
    const isHigher = deviation > 0.05; 
    const deviationAbs = Math.abs(deviation).toFixed(2);
    
    const anomalyText = isHigher ? 
        `**${deviationAbs} HIGHER** (Strong bloom signal)` :
        `**${deviationAbs} LOWER** (Normal or suppressed greening)`;
        
    const anomalyColor = isHigher ? 'color: #d73027;' : 'color: #1a9850;'; 

    
    let farmerForecastHtml = '';
    if (isHigher) {
        farmerForecastHtml = `
            <div style="background-color: #f7ffdd; border: 1px solid #c9e07f; padding: 6px; text-align: center; margin-bottom: 10px; border-radius: 4px;">
                🌾 **FARMER ALERT:** Predicted Peak Bloom in **7-10 Days** (Based on NDVI Trend)
            </div>
        `;
    }
    
    
    let ecologicalImplicationText = "";
    if (isHigher) {
        ecologicalImplicationText = `<p style="font-size: 0.8em; margin-top: 10px; color: #555;">
            <i style="color: #d73027;">Phenology Implication:</i> This significant positive anomaly suggests a strong bloom event, potentially indicating an **early season bloom or surge in growth**. This is a key bio-indicator for monitoring ecological shifts.
        </p>`;
    } else {
        ecologicalImplicationText = `<p style="font-size: 0.8em; margin-top: 10px; color: #555;">
            <i style="color: #1a9850;">Phenology Implication:</i> A lower or normal deviation indicates typical greening patterns, but sustained negative trends could signal **environmental stress affecting bloom health**.
        </p>`;
    }

   
    const chartContainerHtml = `
        ${farmerForecastHtml} 
        
        <div class="anomaly-box" style="text-align: center; padding: 8px; border-radius: 4px; background-color: #f0f0f0;">
            <h4 style="margin: 0 0 5px 0; ${anomalyColor}">Anomaly Check for ${anomaly.month}</h4>
            <p style="margin: 0;">Current NDVI: ${anomaly.currentNdvi.toFixed(3)}</p>
            <p style="margin: 0;">Historical Avg: ${anomaly.historicalAverage.toFixed(3)}</p>
            <p style="margin-top: 5px; font-weight: bold;">
                Deviation: ${anomalyText}
            </p>
        </div>
        <div style="width: 300px; height: 250px; margin-top: 15px;">
            <h3 style="text-align: center; margin-top: 0;">NDVI Trend Comparison</h3>
            <canvas id="historicalNdviChart"></canvas>
        </div>
        ${ecologicalImplicationText} 
        <p style="font-size: 0.75em; text-align: center;">Source: NASA Landsat (Live GEE Data)</p>
    `;
    
    
    popupElement.innerHTML = chartContainerHtml;

    

    const sortedData = timeseries.sort((a, b) => new Date(a.date) - new Date(b.date));
    const labels = sortedData.map(item => item.date.substring(0, 7)); 
    const localNdviValues = sortedData.map(item => item.localNdvi); 
    const regionalNdviValues = sortedData.map(item => item.regionalNdvi);

    const ctx = document.getElementById('historicalNdviChart').getContext('2d');

    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Local Plot NDVI',
                    data: localNdviValues,
                    borderColor: 'rgba(26, 152, 80, 1)', 
                    backgroundColor: 'rgba(26, 152, 80, 0.2)',
                    borderWidth: 2, pointRadius: 1.5
                },
                {
                    label: 'Regional Avg. NDVI (5km)',
                    data: regionalNdviValues,
                    borderColor: 'rgba(56, 108, 176, 1)', 
                    backgroundColor: 'transparent',
                    borderDash: [5, 5], 
                    borderWidth: 1.5, pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                y: { min: 0, max: 1, title: { display: true, text: 'NDVI' } }
            },
            plugins: {
                legend: { display: true, position: 'top' },
                tooltip: { mode: 'index', intersect: false }
            }
        }
    });
}
// =================================================================
//       VISUAL HELPER FUNCTIONS (DYNAMIC ICONS)
// =================================================================

function getIconForFlower(flowerName) {
    
    let iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png'; 
    
    if (flowerName && typeof flowerName === 'string') {
        const lowerName = flowerName.toLowerCase();
        
        if (lowerName.includes('mustard') || lowerName.includes('farm')) {
            iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png'; 
        } else if (lowerName.includes('rose') || lowerName.includes('hibiscus')) {
            iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png'; 
        } else if (lowerName.includes('tree') || lowerName.includes('forest') || lowerName.includes('invasive')) {
            iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png'; 
        }
    }
    
    return L.icon({
        iconUrl: iconUrl,
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });
}

// =================================================================
//      DATABASE AND PIN FUNCTIONS (Moved to the end for correct execution)
// =================================================================

async function loadPinsFromDatabase() {
    pinsLayerGroup.clearLayers();
    const querySnapshot = await db.collection("pins").orderBy("timestamp", "desc").get();
    allPins = []; 
    querySnapshot.forEach((doc) => {
        const pin = doc.data();
        const pinWithId = { ...pin, id: doc.id };
        allPins.push(pinWithId); 
        drawPinOnMap(pin, doc.id); 
    });
    populateFilter(allPins); 
}

async function addPinToDatabase(lat, lng, flowerName, note) {
    try {
        await db.collection("pins").add({
            latitude: lat, longitude: lng, flower: flowerName,
            notes: [note], images: [],
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        loadPinsFromDatabase();
    } catch (e) { console.error("Error adding document: ", e); }
}

function drawPinOnMap(pinData, docId) {
    let notesHtml = pinData.notes ? pinData.notes.map(n => `<li>${n}</li>`).join("") : "<li>No notes yet</li>";
    
    let imagesHtml = '';
    if (pinData.images && pinData.images.length > 0) {
        imagesHtml = pinData.images.map(url => 
            `<a href="${url}" target="_blank"><img src="${url}" class="popup-thumbnail" alt="Sighting Image"></a>`
        ).join('');
    } else {
        imagesHtml = "No images yet.";
    }

    
    const customIcon = getIconForFlower(pinData.flower);

    const popupContent = `
        <b>${pinData.flower}</b><br>
        <p>Notes:</p><ul>${notesHtml}</ul>
        <p>Images:</p><div>${imagesHtml}</div>
        
        <hr style="margin: 5px 0;">
        
                <button onclick="fetchAndShowChart(${pinData.latitude}, ${pinData.longitude})" class="action-btn analyze-btn" style="margin-bottom: 5px; width: 100%;">
            📈 Analyze 20-Year Trend
        </button>
        
        <button onclick="openAddDetailForm('${docId}', ${pinData.latitude}, ${pinData.longitude})">➕ Add More Details</button>
        <button onclick="openImageUploadForm('${docId}', ${pinData.latitude}, ${pinData.longitude})">📷 Add Images</button>
    `;

    L.marker([pinData.latitude, pinData.longitude], { icon: customIcon })
      .addTo(pinsLayerGroup)
      .bindPopup(popupContent, { minWidth: 250 });
}

async function openAddDetailForm(docId, lat, lng) {
    const formContent = `<b>Add More Details</b><br><form id="detailForm">
        <textarea id="extraNote" rows="2" cols="20" required></textarea><br><br>
        <button type="submit">Save</button></form>`;
    const popup = L.popup().setLatLng([lat, lng]).setContent(formContent).openOn(map);
    document.getElementById("detailForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const newNote = document.getElementById("extraNote").value;
        await db.collection("pins").doc(docId).update({ notes: firebase.firestore.FieldValue.arrayUnion(newNote) });
        map.closePopup(popup);
        loadPinsFromDatabase();
    });
}

async function openImageUploadForm(docId, lat, lng) {
    const formContent = `<b>Upload Images</b><br>
        <input type="file" id="imageFile-${docId}" accept="image/*" multiple><br><br>
        <button id="uploadImagesButton-${docId}">Upload</button>`;
    const popup = L.popup().setLatLng([lat, lng]).setContent(formContent).openOn(map);
    document.getElementById(`uploadImagesButton-${docId}`).addEventListener("click", async (e) => {
        e.preventDefault();
        const files = document.getElementById(`imageFile-${docId}`).files;
        if (files.length === 0) { return alert("Please select images"); }
        const urls = [];
        for (const file of files) {
            const storageRef = storage.ref().child(`pins/${docId}/${Date.now()}_${file.name}`);
            await storageRef.put(file);
            urls.push(await storageRef.getDownloadURL());
        }
        await db.collection("pins").doc(docId).update({ images: firebase.firestore.FieldValue.arrayUnion(...urls) });
        map.closePopup(popup);
        loadPinsFromDatabase();
    });
}

function showAddNewPopup(lat, lng) {
    const formContent = `<b>Add a Flower Sighting</b><br><form id="pinForm">
        Flower Name:<br><input type="text" id="flowerName" required><br>
        Note:<br><textarea id="note" rows="2" cols="20"></textarea><br><br>
        <button type="submit">Save Pin</button></form>`;
    const popup = L.popup().setLatLng([lat, lng]).setContent(formContent).openOn(map);
    document.getElementById('pinForm').addEventListener('submit', async function(event) {
        event.preventDefault();
        const flowerName = document.getElementById('flowerName').value;
        const note = document.getElementById('note').value;
        map.closePopup(popup);
        await addPinToDatabase(lat, lng, flowerName, note);
    });
}

function getNearbyPin(lat, lng, pins, maxDistance = 0.0005) {
    return pins.find(pin => 
        Math.abs(pin.latitude - lat) < maxDistance &&
        Math.abs(pin.longitude - lng) < maxDistance
    );
}