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

  const world = await d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson");
console.log("Loaded countries:", world.features.length);

// Use .properties.ISO_A3 directly, no need for idToISO
svg.append("g")
  .selectAll("path")
  .data(world.features)
  .join("path")
  .attr("d", path)
  .attr("fill", d => {
    const iso = d.properties.ISO_A3;
    const value = isoMap.get(iso);
    console.log(`ISO ${iso} → Emissions ${value}`);
    return value != null ? color(value) : "#ccc";
  })
  .attr("stroke", "#fff")
  .attr("stroke-width", 0.5)
  .append("title")
  .text(d => {
    const iso = d.properties.ISO_A3;
    const value = isoMap.get(iso);
    return `${iso ?? "Unknown"}: ${value ? value.toLocaleString() + " MtCO₂" : "No data"}`;
  });
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

