const width = 960, height = 600;
const svg = d3.select("svg");
const tooltip = d3.select(".tooltip");
const projection = d3.geoAlbersUsa()
  .scale(1000)
  .translate([width / 2, height / 2]);
const path = d3.geoPath(projection);

// Clear existing SVG content (useful when switching scenes)
function clearScene() {
  svg.selectAll("*").remove();
  tooltip.style("opacity", 0);
}

// Scene 1: National Overview - Choropleth map of total GDP 2024
async function scene1() {
  clearScene();
  d3.select("h2").text("Scene 1: U.S. State GDP in 2024");

  const [us, gdpData] = await Promise.all([
    d3.json("https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json"),
    d3.json("state_gdp_2024.json")
  ]);

  const gdpMap = new Map(gdpData.map(d => [d.state, d.gdp_2024]));

  const color = d3.scaleSequential()
    .domain([0, d3.max(gdpData, d => d.gdp_2024)])
    .interpolator(d3.interpolateBlues);

  svg.append("g")
    .selectAll("path")
    .data(us.features)
    .join("path")
    .attr("d", path)
    .attr("fill", d => {
      const gdp = gdpMap.get(d.properties.name);
      return gdp ? color(gdp) : "#eee";
    })
    .attr("stroke", "#999")
    .on("mousemove", (event, d) => {
      const gdp = gdpMap.get(d.properties.name);
      tooltip
        .style("opacity", 1)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY + 10) + "px")
        .html(`
          <strong>${d.properties.name}</strong><br/>
          GDP 2024: $${gdp ? gdp.toLocaleString() + " M" : "No data"}
        `);
    })
    .on("mouseout", () => {
      tooltip.style("opacity", 0);
    });
}

// Scene 2: State Industry Breakdown (placeholder)
async function scene2(stateName) {
  clearScene();
  d3.select("h2").text(`Scene 2: Industry Breakdown for ${stateName}`);
  // TODO: Add stacked area/bar chart for industries over time for selected state
}

// Scene 3: Compare States (placeholder)
async function scene3() {
  clearScene();
  d3.select("h2").text("Scene 3: Compare States");
  // TODO: Add small multiples bar charts for top 3 sectors by state
}

// Scene 4: Unique Economies (placeholder)
async function scene4() {
  clearScene();
  d3.select("h2").text("Scene 4: Unique Economies Highlights");
  // TODO: Add callouts for states with unique dominant industries
}

// Start with Scene 1 on page load
scene1();
