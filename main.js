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
  d3.select("h2").text(`Scene 2: ${state} GDP by Industry (2013–2024)`);

  const data = await d3.json("state_industry_gdp_long.json");
  const stateData = data.filter(d => d.state === state && d.industry !== "All industry total");

  const industries = Array.from(new Set(stateData.map(d => d.industry)));

  // Pivot: {year -> {industry -> gdp}}
  const years = d3.range(2013, 2025);
  const nested = d3.rollup(
    stateData,
    v => {
      const byIndustry = {};
      for (const row of v) {
        byIndustry[row.industry] = row.gdp;
      }
      return byIndustry;
    },
    d => d.year
  );

  const stackData = years.map(year => {
    const values = nested.get(year) || {};
    values.year = year;
    return values;
  });

  const stack = d3.stack()
    .keys(industries)
    .order(d3.stackOrderNone)
    .offset(d3.stackOffsetNone);

  const series = stack(stackData);

  const margin = { top: 50, right: 30, bottom: 40, left: 80 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const x = d3.scaleLinear()
    .domain(d3.extent(years))
    .range([0, innerWidth]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(series, s => d3.max(s, d => d[1]))])
    .nice()
    .range([innerHeight, 0]);

  const color = d3.scaleOrdinal()
    .domain(industries)
    .range(d3.schemeCategory10);

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  g.append("g")
    .selectAll("path")
    .data(series)
    .join("path")
    .attr("fill", d => color(d.key))
    .attr("d", d3.area()
      .x(d => x(d.data.year))
      .y0(d => y(d[0]))
      .y1(d => y(d[1]))
    )
    .append("title")
    .text(d => d.key);

  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).ticks(12).tickFormat(d3.format("d")));

  g.append("g")
    .call(d3.axisLeft(y));

  g.append("text")
    .attr("x", innerWidth / 2)
    .attr("y", -20)
    .attr("text-anchor", "middle")
    .attr("font-size", 16)
    .text(`${state}: GDP by Industry Over Time`);
}

// Start with Scene 1
scene1();
