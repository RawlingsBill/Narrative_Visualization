let currentScene = 0;
const svg = d3.select("#viz");
const width = +svg.attr("width");
const height = +svg.attr("height");

const scenes = [scene1, scene2, scene3];

function clearScene() {
  svg.selectAll("*").remove();
}

async function scene1() {
  clearScene();
  d3.select("#subtitle").text("Scene 1: Overview of Global CO₂ Emissions");

  // Load the world map and emission data
  const world = await d3.json("world-110m.json");
  const countries = topojson.feature(world, world.objects.countries).features;
  console.log("Loaded countries:", countries.length);

  const emissions = await d3.csv("emissions.csv", d => ({
    iso: d.iso_a3,
    emissions: +d.emissions
  }));
  const isoMap = new Map(emissions.map(d => [d.iso, d.emissions]));
  console.log("Sample emission (USA):", isoMap.get("USA"));

  // Load country ISO mappings from the world-country-names.tsv
  const countryISO = await d3.tsv("world-country-names.tsv");
  console.log(countryISO.slice(0, 5));  // Log first 5 rows to check the format

  // Create a map for country ID -> ISO code lookup
  const idToISO = new Map(countryISO.map(d => [parseInt(d.id, 10), d.iso_a3]));
  console.log("ISO lookup for 840 (USA):", idToISO.get(840));

  // Set up the map projection
  const projection = d3.geoMercator()
    .scale(120)
    .translate([width / 2, height / 1.5]);

  const path = d3.geoPath().projection(projection);

  // Define color scale based on emissions
  const color = d3.scaleSequential()
    .domain([0, d3.max(emissions, d => d.emissions)])
    .interpolator(d3.interpolateReds);

  // Draw the countries on the map
  svg.append("g")
    .selectAll("path")
    .data(countries)
    .join("path")
    .attr("d", path)
    .attr("fill", d => {
      const iso = idToISO.get(+d.id);  // Look up the ISO code for each country
      const value = isoMap.get(iso);   // Get the emissions value for the country
      if (!iso) {
        console.warn(`No ISO code found for Country ID: ${d.id}`);
      }
      console.log(`Country ID ${d.id} → ISO ${iso} → Emissions ${value}`);
      return value != null ? color(value) : "#ccc";  // Use the emissions color or gray out if no data
    })
    .attr("stroke", "#fff")
    .attr("stroke-width", 0.5)
    .append("title")
    .text(d => {
      const iso = idToISO.get(+d.id);  // Get the ISO code
      const value = isoMap.get(iso);   // Get the emissions value
      return `${iso ?? "Unknown"}: ${value ? value.toLocaleString() + " MtCO₂" : "No data"}`;
    });
}
function scene2() {
  clearScene();
  d3.select("#subtitle").text("Scene 2: Emissions Over Time");
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height / 2)
    .attr("text-anchor", "middle")
    .attr("font-size", "24px")
    .text("[Line chart of CO2 emissions over time]");
}

function scene3() {
  clearScene();
  d3.select("#subtitle").text("Scene 3: Per Capita Emissions");
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height / 2)
    .attr("text-anchor", "middle")
    .attr("font-size", "24px")
    .text("[Bar chart of per capita emissions]");
}

function updateScene() {
  scenes[currentScene]();
}

d3.select("#nextBtn").on("click", () => {
  if (currentScene < scenes.length - 1) {
    currentScene++;
    updateScene();
  }
});

d3.select("#prevBtn").on("click", () => {
  if (currentScene > 0) {
    currentScene--;
    updateScene();
  }
});

// Initialize first scene
updateScene();

