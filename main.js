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

  const width = +svg.attr("width");
  const height = +svg.attr("height");

  const world = await d3.json("world-110m.json");

  const emissions = await d3.csv("emissions.csv", d => ({
    iso: d.iso_a3,
    emissions: +d.emissions
  }));

  const isoMap = new Map(emissions.map(d => [d.iso, d.emissions]));

  const countries = topojson.feature(world, world.objects.countries).features;

  // Map numeric id to ISO using a known country code list
  const countryISO = await d3.tsv("https://gist.githubusercontent.com/mbostock/4090846/raw/world-country-names.tsv");
  const idToISO = new Map(countryISO.map(d => [d.id, d.iso_a3]));

  const projection = d3.geoMercator()
    .scale(120)
    .translate([width / 2, height / 1.5]);

  const path = d3.geoPath().projection(projection);

  const color = d3.scaleSequential()
    .domain([0, d3.max(emissions, d => d.emissions)])
    .interpolator(d3.interpolateReds);

  svg.append("g")
    .selectAll("path")
    .data(countries)
    .join("path")
    .attr("d", path)
    .attr("fill", d => {
      const iso = idToISO.get(d.id); // map numeric ID to ISO A3
      const value = isoMap.get(iso);
      return value != null ? color(value) : "#ccc";
    })
    .attr("stroke", "#fff")
    .attr("stroke-width", 0.5)
    .append("title")
    .text(d => {
      const iso = idToISO.get(d.id);
      const value = isoMap.get(iso);
      return `${iso ?? "?"}: ${value ? value.toLocaleString() + " MtCO₂" : "No data"}`;
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

