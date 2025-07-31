const width = 960, height = 600;
const svg = d3.select("svg");
const tooltip = d3.select(".tooltip");

// Albers USA projection
const projection = d3.geoAlbersUsa()
  .scale(1000)
  .translate([width / 2, height / 2]);

const path = d3.geoPath(projection);

// Clear existing scene content
function clearScene() {
  svg.selectAll("*").remove();
  tooltip.style("opacity", 0);
}

// Scene 1: U.S. State GDP in 2024
async function scene1() {
  clearScene();
  d3.select("h2").text("Scene 1: U.S. State GDP in 2024");

  try {
    // Load TopoJSON + GDP JSON
    const [usTopo, gdpData] = await Promise.all([
      d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"),
      d3.json("state_gdp_2024.json")
    ]);

    // Convert TopoJSON to GeoJSON
    const us = topojson.feature(usTopo, usTopo.objects.states);

    // Create a map of state GDP values
    const gdpMap = new Map(gdpData.map(d => [d.state.trim(), d.gdp_2024]));

    // Check if all GeoJSON states have GDP data
    const geoStates = new Set(us.features.map(d => d.properties.name.trim()));
    const gdpStates = new Set(gdpData.map(d => d.state.trim()));

    for (let state of geoStates) {
      if (!gdpStates.has(state)) {
        console.warn(`No GDP data for: ${state}`);
      }
    }

    // Color scale
    const color = d3.scaleSequential()
      .domain([0, d3.max(gdpData, d => d.gdp_2024)])
      .interpolator(d3.interpolateBlues);

    // Draw the map
    svg.append("g")
      .selectAll("path")
      .data(us.features)
      .join("path")
      .attr("d", path)
      .attr("fill", d => {
        const gdp = gdpMap.get(d.properties.name.trim());
        return gdp ? color(gdp) : "#eee";
      })
      .attr("stroke", "#999")
      .on("mousemove", (event, d) => {
        const gdp = gdpMap.get(d.properties.name.trim());
        tooltip
          .style("opacity", 1)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY + 10) + "px")
          .html(`
            <strong>${d.properties.name}</strong><br/>
            GDP 2024: ${gdp ? "$" + gdp.toLocaleString() + " M" : "No data"}
          `);
      })
      .on("mouseout", () => {
        tooltip.style("opacity", 0);
      });

  } catch (err) {
    console.error("Error loading or processing data:", err);
  }
}

// Load Scene 1 on startup
scene1();
