// Declare map variable globally so all functions have access
var map; // Variable to hold the Leaflet map
var minValue; // Variable to store the minimum value
var attributes; // Array to store the data attributes
var index = 0; // Index variable to track the selected attribute
var legendControl; // Variable to hold the legend control

// Create the Leaflet map
function createMap() {
  // Create the map
  map = L.map('map', {
    center: [0, 0], // Set the center coordinates of the map
    zoom: 2 // Set the initial zoom level
  });

  // Add Carto Voyager base tilelayer
  var CartoDB_Voyager = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(map);

  // Add Carto Dark Matter basemap
  var CartoDB_DarkMatter = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
  });

  // Add Esri World Imagery basemap
  var Esri_WorldImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
  });

  // Create a basemap control layer
  var basemaps = {
    "Carto Voyager": CartoDB_Voyager,
    "Carto Dark Matter": CartoDB_DarkMatter,
    "Esri World Imagery": Esri_WorldImagery
  };

  L.control.layers(basemaps).addTo(map);

  // Call getData function to retrieve the data for the map
  getData();

  // Create the legend control
  legendControl = L.control({ position: 'bottomleft' });

  // Add the legend control to the map
  legendControl.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'legend');
    div.innerHTML += '<b>Legend</b><br />';
    div.innerHTML += '<p><svg width="12" height="12"><circle cx="6" cy="6" r="6" fill="#8df791" /></svg> Increased</p>';
    div.innerHTML += '<p><svg width="12" height="12"><circle cx="6" cy="6" r="6" fill="#8cc3fa" /></svg> Remained the Same</p>';
    div.innerHTML += '<p><svg width="12" height="12"><circle cx="6" cy="6" r="6" fill="#f52226" /></svg> Decreased</p>';
    div.innerHTML += '<p>City GDP in <span id="legend-year"></span></p>';
    return div;
  };

  legendControl.addTo(map);
}

// Import GeoJSON data
function getData() {
  // Load the data using fetch
  fetch("data/GDP.geojson")
    .then(function (response) {
      return response.json();
    })
    .then(function (json) {
      // Calculate the minimum data value
      minValue = calculateMinValue(json);
      // Process the data attributes
      attributes = processData(json);
      // Call the function to create proportional symbols
      createPropSymbols(json, attributes);
      createSequenceControls();
    });
}

// Add circle markers for point features to the map
function createPropSymbols(data, attributes) {
  L.geoJson(data, {
    pointToLayer: pointToLayer,
    style: function (feature) {
      var attribute = attributes[index];
      var fillColor = feature.properties['Color ' + attribute];
      return {
        fillColor: fillColor,
        color: "#021a24",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.3
      };
    }
  }).addTo(map);

  // Update the legend
  updateLegend(attributes[index]);
}

// Calculate the minimum data value
function calculateMinValue(data) {
  var allValues = [];
  for (var feature of data.features) {
    for (var attribute in feature.properties) {
      if (!isNaN(parseFloat(feature.properties[attribute]))) {
        allValues.push(parseFloat(feature.properties[attribute]));
      }
    }
  }
  var minValue = Math.min(...allValues);
  return minValue;
}

// Create circle marker layer with specified style options
function pointToLayer(feature, latlng) {
  var attribute = attributes[index];
  var attValue = parseFloat(feature.properties[attribute]);
  var radius = calcPropRadius(attValue);

  var geojsonMarkerOptions = {
    radius: radius,
    fillColor: "#1db8f5",
    color: "#021a24",
    weight: 1,
    opacity: 1,
    fillOpacity: 0.3
  };

  var layer = L.circleMarker(latlng, geojsonMarkerOptions);

  var popupContent = "<p><b>City:</b> " + feature.properties.City + "</p>";
  popupContent += "<p><b>" + attribute + ":</b> " + feature.properties[attribute] + "</p>";

  layer.bindPopup(popupContent, { offset: new L.Point(0, -radius) });

  return layer;
}

// Process the data attributes
function processData(data) {
  var attributes = [];
  var properties = data.features[0].properties;
  for (var attribute in properties) {
    if (!isNaN(parseInt(attribute))) {
      attributes.push(attribute);
    }
  }
  return attributes;
}

// Assign the current attribute based on the index
function updatePropSymbols(attribute) {
  map.eachLayer(function (layer) {
    if (layer.feature && layer.feature.properties[attribute]) {
      var props = layer.feature.properties;
      var radius = calcPropRadius(parseFloat(props[attribute]));
      layer.setRadius(radius);

      var fillColor = props['Color ' + attribute];
      layer.setStyle({ fillColor: fillColor });

      var popupContent = "<p><b>City:</b> " + props.City + "</p>";
      popupContent += "<p><b>" + attribute + ":</b> " + props[attribute] + "</p>";

      var popup = layer.getPopup();
      popup.setContent(popupContent).update();
    }
  });
}

// For each feature, determine its value for the selected attribute
function calcPropRadius(attValue) {
  var minRadius = 2;
  var scaleFactor = .01; // Adjust this value to control the scale of changes
  var radius = minRadius + scaleFactor * Math.sqrt(attValue);
  return radius;
}

// Create new sequence controls
function createSequenceControls() {
  // Add step buttons
  var reverseButton = "<button class='step' id='reverse'><img src='img/reverse.png'></button>";
  var forwardButton = "<button class='step' id='forward'><img src='img/forward.png'></button>";
  document.querySelector('#panel').insertAdjacentHTML('beforeend', reverseButton);
  document.querySelector('#panel').insertAdjacentHTML('beforeend', forwardButton);

  // Add click listener for step buttons
  document.querySelectorAll('.step').forEach(function (step) {
    step.addEventListener("click", function () {
      var index = Number(document.querySelector('.range-slider').value);

      // Update the index based on the button clicked (forward or reverse)
      if (step.id === "forward") {
        index = (index + 1) % attributes.length;
      } else {
        index = (index - 1 + attributes.length) % attributes.length;
      }

      // Update the slider value
      document.querySelector('.range-slider').value = index;

      // Update the proportional symbols
      updatePropSymbols(attributes[index]);
      updateLegend(attributes[index]);
    });
  });

  var slider = "<input class='range-slider' type='range'>";
  document.querySelector("#panel").insertAdjacentHTML('beforeend', slider);

  var rangeSlider = document.querySelector(".range-slider");
  rangeSlider.max = attributes.length - 1;
  rangeSlider.min = 0;
  rangeSlider.value = 0;

  rangeSlider.addEventListener('input', function () {
    var index = this.value;
    updatePropSymbols(attributes[index]);
    updateLegend(attributes[index]);
  });
}

// Update the legend
function updateLegend(attribute) {
  // Extract the year from the attribute column header
  var year = attribute.substring(attribute.indexOf(' ') + 1);

  // Remove the existing legend control from the map
  if (legendControl && map.hasLayer(legendControl)) {
    map.removeControl(legendControl);
  }

  // Create the legend control with the updated content
  legendControl.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'legend');
    div.innerHTML += '<b>Legend</b><br />';
    div.innerHTML += '<p>City GDP in <span id="legend-year">' + year + '</span></p>';
    div.innerHTML += '<p><svg width="12" height="12"><circle cx="6" cy="6" r="6" fill="#8df791" /></svg> Increased</p>';
    div.innerHTML += '<p><svg width="12" height="12"><circle cx="6" cy="6" r="6" fill="#8cc3fa" /></svg> Remained the Same</p>';
    div.innerHTML += '<p><svg width="12" height="12"><circle cx="6" cy="6" r="6" fill="#f52226" /></svg> Decreased</p>';
    return div;
  };

  // Add the updated legend control to the map
  legendControl.addTo(map);
}

// Wait for the DOM to load before creating the map
document.addEventListener('DOMContentLoaded', createMap);
