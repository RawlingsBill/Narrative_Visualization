const width = 960, height = 600;
const svg = d3.select("svg");
const tooltip = d3.select(".tooltip");
const backButton = d3.select("#back-button");

const projection = d3.geoAlbersUsa()
  .scale(1000)
  .translate([width / 2, height / 2]);

const path = d3.geoPath(projection);

function clearScene() {
  svg.selectAll("*").remove();
  tooltip.style("opacity", 0);
}

async function scene1() {
  clearScene();
  d3.select("h2").text("Scene 1: U.S. State GDP in 2024");
  backButton.style("display", "none");

  try {
    const [us, gdpData] = await Promise.all([
      d3.json("https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json"),
      d3.json("state_gdp_2024.json")
    ]);

    const gdpMap = new Map(gdpData.map(d => [d.state.trim(), d.gdp_2024]));

    const color = d3.scaleSequential()
      .domain([0, d3.max(gdpData, d => d.gdp_2024)])
      .interpolator(d3.interpolateBlues);

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
            GDP 2024: $${gdp ? gdp.toLocaleString() + " M" : "No data"}
          `);
      })
      .on("mouseout", () => tooltip.style("opacity", 0))
      .on("click", (event, d) => scene2(d.properties.name));

  } catch (err) {
    console.error("Error loading Scene 1:", err);
  }
}

async function scene2(stateName) {
  clearScene();
  d3.select("h2").text(`Scene 2: ${stateName} - Industry GDP Over Time`);
  backButton.style("display", "block");

  try {
    const raw = await d3.csv("state_gdp_by_industry.csv");
    const filtered = raw.filter(d => d.GeoName.trim() === stateName && d.LineCode !== "1");
    const years = Object.keys(filtered[0]).filter(k => /^20\d{2}$/.test(k));

    const stackedData = d3.stack()
      .keys(years)
      .value((d, key) => +d[key])(filtered);

    const industries = filtered.map(d => d.Description.trim());

    const x = d3.scaleBand()
      .domain(years)
      .range([60, width - 20])
      .padding(0.1);

    const y = d3.scaleLinear()
      .domain([0, d3.max(stackedData[stackedData.length - 1], d => d[1])])
      .range([height - 50, 20]);

    const color = d3.scaleOrdinal()
      .domain(industries)
      .range(d3.schemeTableau10);

    const groups = svg.selectAll("g.layer")
      .data(stackedData)
      .join("g")
      .attr("class", "layer")
      .attr("fill", (d, i) => color(filtered[i].Description.trim()));

    groups.selectAll("rect")
      .data(d => d)
      .join("rect")
      .attr("x", (d, i) => x(years[i]))
      .attr("y", d => y(d[1]))
      .attr("height", d => y(d[0]) - y(d[1]))
      .attr("width", x.bandwidth())
      .append("title")
      .text((d, i, nodes) => `${industries[nodes[i].parentNode.__data__.index]}: ${(+d[1] - +d[0]).toFixed(1)} M`);

    svg.append("g")
      .attr("transform", `translate(0, ${height - 50})`)
      .call(d3.axisBottom(x));

    svg.append("g")
      .attr("transform", `translate(60, 0)`)
      .call(d3.axisLeft(y));

    const legend = svg.append("g")
      .attr("transform", `translate(${width - 200}, 20)`);

    industries.forEach((ind, i) => {
      const g = legend.append("g").attr("transform", `translate(0, ${i * 20})`);
      g.append("rect").attr("width", 12).attr("height", 12).attr("fill", color(ind));
      g.append("text").attr("x", 18).attr("y", 10).text(ind);
    });

  } catch (err) {
    console.error("Error loading Scene 2:", err);
  }
}

backButton.on("click", () => scene1());

scene1();
