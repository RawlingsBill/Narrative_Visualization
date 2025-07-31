const width = 960, height = 600;
const svg = d3.select("svg");
const tooltip = d3.select(".tooltip");
const projection = d3.geoAlbersUsa()
  .scale(1000)
  .translate([width / 2, height / 2]);
const path = d3.geoPath(projection);

// Clear existing SVG content
function clearScene() {
  svg.selectAll("*").remove();
  tooltip.style("opacity", 0);
}

// Scene 1: National Overview
async function scene1() {
  clearScene();
  d3.select("h2").text("Scene 1: U.S. State GDP in 2024");

  try {
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

  } catch (err) {
    console.error("Error loading files:", err);
  }
}

// Start with Scene 1
scene1();
