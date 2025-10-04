// Shared JS for BloomWatch (index, map, about, contact)
// Guards: map logic only runs if #map exists.

document.addEventListener("DOMContentLoaded", () => {
  // highlight nav link (simple)
  document.querySelectorAll(".nav-link").forEach(a => {
    if (location.pathname.endsWith(a.getAttribute("href"))) {
      a.classList.add("active");
    }
  });

  // Initialize mini-map on homepage if present
  if (document.getElementById("mini-map")) {
    try {
      const mini = L.map("mini-map", { zoomControl: false, attributionControl: false }).setView([20.5937, 78.9629], 4);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19
      }).addTo(mini);

      // sample marker (hotspot)
      L.circle([26.9124, 75.7873], { radius: 60000, color: 'red', fillOpacity: 0.4 }).addTo(mini).bindPopup("Example hotspot");
    } catch (e) {
      console.warn("Leaflet mini-map error", e);
    }
  }

  // Map page: initialize main map
  if (document.getElementById("map")) {
    initMainMap();
  }

  // --- Update the Contact Form submission logic ---
const contactForm = document.getElementById("contactForm"); // Assuming your form has this ID
if (contactForm) {
  contactForm.addEventListener("submit", (e) => {
    e.preventDefault(); // Prevent default form submission

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const message = document.getElementById("message").value.trim(); // Assuming a textarea with id="message"

    const formData = { name, email, message };

    fetch('/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        alert(data.message);
        contactForm.reset(); // Clear the form
      } else {
        alert('Error: ' + data.message);
      }
    })
    .catch(error => {
      console.error('Error submitting form:', error);
      alert('An error occurred. Please try again later.');
    });
  });
}


// --- Update the date input logic to fetch new data ---
const dateInput = document.getElementById("dateInput");
if (dateInput){
  const d = new Date(); dateInput.value = d.toISOString().slice(0,10);
  dateInput.addEventListener("change", () => {
    const selectedDate = dateInput.value;
    console.log("Date changed, fetching data for: " + selectedDate);

    // Fetch data for the specific date
    fetch(`/api/bloom?date=${selectedDate}`)
        .then(res => res.json())
        .then(data => {
            if (geoLayer) {
                map.removeLayer(geoLayer); // Remove the old layer
                layerControl.removeLayer(geoLayer); // Remove from control
            }
            if (data.features.length === 0) {
                alert(`No bloom data found for ${selectedDate}`);
                return;
            }

            // Create and add the new layer
            geoLayer = L.geoJSON(data, { 
                style: styleFeature, 
                onEachFeature: function(feature, layer){
                  layer.on('click', () => {
                    openFeatureModal(feature);
                  });
                  layer.bindTooltip(`${feature.properties.name} — intensity ${feature.properties.bloom_intensity}`, {sticky:true});
                }
            }); // You can copy the onEachFeature logic
            geoLayer.addTo(map);
            layerControl.addOverlay(geoLayer, "Bloom Hotspots");
            map.fitBounds(geoLayer.getBounds(), { padding: [20, 20] });
        })
        .catch(err => console.error("Error fetching dated data:", err));
  });
}

// --------------- Helper function for NASA GIBS date ---------------
function getTodaysDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// --------------- Main map implementation ---------------
function initMainMap(){
  const map = L.map("map", { zoomControl: true }).setView([20.5937, 78.9629], 5);

  // Base tiles (OSM)
  const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // --- START: ADDED NASA GIBS CODE ---

  const time = getTodaysDate(); // Get today's date: 2025-09-27

  // Define the NASA True Color layer (for visual context)
  const nasaTrueColor = L.tileLayer('https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/{layer}/default/{time}/{tilematrixSet}/{z}/{y}/{x}.jpg', {
      layer: 'VIIRS_SNPP_CorrectedReflectance_TrueColor',
      tilematrixSet: 'GoogleMapsCompatible_Level9',
      time: time,
      attribution: '<a href="https://earthdata.nasa.gov/gibs">NASA GIBS</a>',
      maxZoom: 9
  });

  // Define the NASA Vegetation Index layer (highly relevant for BloomWatch!)
  // This is an 8-day product, so we use a recent valid date.
  const nasaNDVI = L.tileLayer('https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/{layer}/default/{time}/{tilematrixSet}/{z}/{y}/{x}.png', {
      layer: 'MODIS_Terra_NDVI_8Day',
      tilematrixSet: 'GoogleMapsCompatible_Level8',
      time: '2025-09-20', // Using a recent valid date for this 8-day product
      attribution: '<a href="https://earthdata.nasa.gov/gibs">NASA GIBS</a> (MODIS NDVI)',
      maxZoom: 8,
      opacity: 0.75
  });

  // --- END: ADDED NASA GIBS CODE ---

  // --- Function definitions (getColor, styleFeature) remain the same ---
function getColor(i){
  if (i > 0.8) return '#e74c3c';
  if (i > 0.6) return '#e67e22';
  if (i > 0.4) return '#f1c40f';
  return '#2ecc71';
}

function styleFeature(f){ return { fillColor: getColor(f.properties.bloom_intensity), weight:1, color:'#ffffff', fillOpacity:0.7 } }


// --- Load GeoJSON data from our new backend API ---
let geoLayer; // Define geoLayer here so it's accessible in other functions

fetch('/api/bloom')
  .then(response => response.json())
  .then(data => {
    geoLayer = L.geoJSON(data, {
      style: styleFeature,
      onEachFeature: function(feature, layer){
        layer.on('click', () => {
          openFeatureModal(feature);
        });
        // simple tooltip
        layer.bindTooltip(`${feature.properties.name} — intensity ${feature.properties.bloom_intensity}`, {sticky:true});
      }
    });

    // Add layer to the map and layer control
    geoLayer.addTo(map);
    layerControl.addOverlay(geoLayer, "Bloom Hotspots");

    // Fit map bounds to the loaded data
    try {
        if (data.features.length > 0) {
            map.fitBounds(geoLayer.getBounds(), { padding:[20,20] });
        }
    } catch(e){
        console.warn("Could not fit map bounds.", e);
    }

  })
  .catch(error => console.error('Error fetching bloom data:', error));


// --- Update the Layer Control and other sections ---

// We will add the GeoJSON layer to the control dynamically after it loads.
// So we define it slightly differently.
const baseMaps = {
  "Street Map": osm
};

const overlayMaps = {
  "NASA True Color (Today)": nasaTrueColor,
  "NASA Vegetation Index (NDVI)": nasaNDVI
  // "Bloom Hotspots (Demo)" will be added after fetch
};

const layerControl = L.control.layers(baseMaps, overlayMaps, { collapsed: false }).addTo(map);
nasaNDVI.addTo(map);

  // --- END: ADDED LAYER CONTROL ---

  // Fit to data
  try {
    map.fitBounds(geoLayer.getBounds(), { padding:[20,20] });
  } catch(e){}

  // Controls: play timelapse button (demo)
  const playBtn = document.getElementById("playBtn");
  if (playBtn){
    let playing = false, idx = 0;
    const frames = [0.3,0.5,0.7,0.9];
    playBtn.addEventListener("click", () => {
      if (!playing){
        playing = true; playBtn.textContent = "⏸ Pause timelapse";
        const iv = setInterval(() => {
          idx = (idx + 1) % frames.length;
          // update sample layer colors by mutating style
          geoLayer.eachLayer(l => {
            const base = l.feature.properties;
            // fake animation by scaling intensity
            const newi = Math.min(1, base.bloom_intensity * frames[idx]);
            l.setStyle({ fillColor: getColor(newi) });
          });
        }, 900);
        playBtn._iv = iv;
      } else {
        playing = false; playBtn.textContent = "▶ Play timelapse";
        clearInterval(playBtn._iv);
      }
    });
  }

  // Search box (wired to Nominatim Geocoding API)
const searchBox = document.getElementById("searchBox");
if (searchBox){
  searchBox.addEventListener("keypress", (e) => {
    if (e.key === 'Enter'){
      const query = searchBox.value.trim();
      if (query === "") return; // Do nothing if search is empty

      // Use the free Nominatim API for geocoding
      const apiUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
      
      console.log("Searching for:", query);

      fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
          if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);
            
            console.log("Found location:", data[0].display_name);
            
            // Fly to the location on the map
            map.flyTo([lat, lon], 12); // Zoom level 12

            // Add a temporary marker
            L.marker([lat, lon]).addTo(map)
              .bindPopup(`<b>${data[0].display_name}</b>`)
              .openPopup();
          } else {
            alert("Location not found. Please try a different search.");
          }
        })
        .catch(error => {
          console.error("Error during geocoding:", error);
          alert("There was an error searching for the location.");
        });
    }
  });
}

  // plant filter (live frontend filtering)
const plantFilter = document.getElementById("plantFilter");
if (plantFilter){
  plantFilter.addEventListener("change", () => {
    const selectedCategory = plantFilter.value;
    
    // First, remove the existing geoLayer from the map
    if (map.hasLayer(geoLayer)) {
        map.removeLayer(geoLayer);
    }

    // Filter the original data based on the selection
    let filteredFeatures;
    if (selectedCategory === "all") {
        // If "all" is selected, use all features
        filteredFeatures = sampleGeo.features;
    } else {
        // Otherwise, filter by the category property we added
        filteredFeatures = sampleGeo.features.filter(feature => {
            return feature.properties.category === selectedCategory;
        });
    }

    // Create a new GeoJSON layer with only the filtered features
    // We have to re-assign geoLayer so other parts of the app can see it
    geoLayer = L.geoJSON({ type: "FeatureCollection", features: filteredFeatures }, {
      style: styleFeature,
      onEachFeature: function(feature, layer){
        layer.on('click', () => {
          openFeatureModal(feature);
        });
        layer.bindTooltip(`${feature.properties.name} — intensity ${feature.properties.bloom_intensity}`, {sticky:true});
      }
    }).addTo(map);

    console.log(`Filtered to show: ${selectedCategory}`);
  });
}
  // date input demo
  const dateInput = document.getElementById("dateInput");
  if (dateInput){
    const d = new Date(); dateInput.value = d.toISOString().slice(0,10);
    dateInput.addEventListener("change", () => {
      alert("Date changed: " + dateInput.value + "\nIn production you'll load that date's NDVI tiles or compute difference in Earth Engine.");
    });
  }

  // Modal open/populate
  function openFeatureModal(feature){
    const modal = document.getElementById("imageModal");
    const img = document.getElementById("modalImg");
    const meta = document.getElementById("modalMeta");
    // sample placeholder image path - replace with server-provided tile or GIBS preview
    img.src = "assets/images/gallery1.jpg";
    img.alt = feature.properties.name;
    meta.innerHTML = `<strong>${feature.properties.name}</strong><br/>
      Bloom intensity: ${feature.properties.bloom_intensity}<br/>
      NDVI history: ${feature.properties.ndvi_history.join(", ")}<br/>
      Satellite: ${feature.properties.sat_meta.sat} — ${feature.properties.sat_meta.sensor} — ${feature.properties.sat_meta.date}
      <br/><br/><em>Link to original source (demo): add Earthdata/Worldview/Landsat link here.</em>`;
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden","false");
  }

  const modalClose = document.getElementById("modalClose");
  if (modalClose) modalClose.addEventListener("click", () => {
    document.getElementById("imageModal").classList.add("hidden");
  });

  // Close modal on outside click
  document.getElementById("imageModal").addEventListener("click", (ev) => {
    if (ev.target.id === "imageModal") document.getElementById("imageModal").classList.add("hidden");
  });
  fetch('/api/gallery')
  .then(res => res.json())
  .then(data => {
    const gallery = document.getElementById('gallery');
    data.forEach(item => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <img src="/images/${item.file}" alt="${item.title}">
        <h3>${item.title}</h3>
        <p>${item.location} - ${item.date}</p>
        <p>Satellite: ${item.satellite}</p>
      `;
      gallery.appendChild(card);
    });
  });
fetch('/api/bloom')
  .then(res => res.json())
  .then(data => {
    L.geoJson(data, {
      style: feature => ({
        fillColor: getColor(feature.properties.bloom_intensity),
        weight: 1,
        color: 'white',
        fillOpacity: 0.7
      })
    }).addTo(map);
  });

}});