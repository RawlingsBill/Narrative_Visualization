const width = 960, height = 600;
const svg = d3.select("svg");
const tooltip = d3.select(".tooltip");

const projection = d3.geoAlbersUsa()
  .scale(1000)
  .translate([width / 2, height / 2]);

const path = d3.geoPath(projection);

function clearScene() {
  svg.selectAll("*").remove();
  tooltip.style("opacity", 0);
}

// Scene 1: National Map
async function scene1() {
  clearScene();
  d3.select("h2").text("Scene 1: U.S. State GDP in 2024");

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
    .data(us.features.filter(d => d.properties.name !== "Virginia")) // fix bad geometry
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
        .html(`<strong>${d.properties.name}</strong><br/>GDP 2024: $${gdp?.toLocaleString()} M`);
    })
    .on("mouseout", () => tooltip.style("opacity", 0))
    .on("click", (event, d) => {
      const state = d.properties.name.trim();
      scene2(state);
    });
}

// Scene 2: State Industry Breakdown
async function scene2(state) {
  clearScene();
  d3.select("h2").text(`Scene 2: ${state} GDP by Industry Over Time`);

  d3.select("#back-button")
    .style("display", "inline-block")
    .on("click", () => {
      d3.select("#back-button").style("display", "none");
      scene1();
    });

  const data = await d3.json("state_industry_gdp_long.json");

  const stateData = data.filter(d => d.state === state && d.industry !== "All industry total");

  // Pivot data for stacking
  const nested = d3.groups(stateData, d => d.year);
  const stackedData = nested.map(([year, entries]) => {
    const obj = { year: +year };
    entries.forEach(d => {
      obj[d.industry] = d.gdp;
    });
    return obj;
  });

  const industries = Array.from(new Set(stateData.map(d => d.industry)));

  const stack = d3.stack()
    .keys(industries)
    .order(d3.stackOrderNone)
    .offset(d3.stackOffsetNone);

  const series = stack(stackedData);

  const margin = { top: 40, right: 150, bottom: 40, left: 60 };
  const width = 960 - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  const svg = d3.select("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand()
    .domain(stackedData.map(d => d.year))
    .range([0, width])
    .padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, d3.max(stackedData, d =>
      d3.sum(industries, k => d[k] || 0)
    )])
    .nice()
    .range([height, 0]);

  const color = d3.scaleOrdinal()
    .domain(industries)
    .range(d3.schemeCategory10);

  g.append("g")
    .selectAll("g")
    .data(series)
    .join("g")
    .attr("fill", d => color(d.key))
    .selectAll("rect")
    .data(d => d)
    .join("rect")
    .attr("x", d => x(d.data.year))
    .attr("y", d => y(d[1]))
    .attr("height", d => y(d[0]) - y(d[1]))
    .attr("width", x.bandwidth())
    .append("title")
    .text(d => `${d.data.year}: $${(d[1] - d[0]).toLocaleString()} M`);

  // X Axis
  g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")));

  // Y Axis
  g.append("g")
    .call(d3.axisLeft(y).ticks(6));

  // Legend
  const legend = svg.append("g")
    .attr("transform", `translate(${width + margin.left + 10}, ${margin.top})`);

  industries.forEach((industry, i) => {
    const row = legend.append("g").attr("transform", `translate(0, ${i * 20})`);
    row.append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", color(industry));
    row.append("text")
      .attr("x", 18)
      .attr("y", 10)
      .text(industry)
      .style("font-size", "12px");
  });
}

// Start with Scene 1
scene1();
