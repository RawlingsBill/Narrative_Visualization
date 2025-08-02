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

const stateNameMap = new Map([
  [1, "Alabama"], [2, "Alaska"], [4, "Arizona"], [5, "Arkansas"],
  [6, "California"], [8, "Colorado"], [9, "Connecticut"], [10, "Delaware"],
  [11, "District of Columbia"], [12, "Florida"], [13, "Georgia"], [15, "Hawaii"],
  [16, "Idaho"], [17, "Illinois"], [18, "Indiana"], [19, "Iowa"],
  [20, "Kansas"], [21, "Kentucky"], [22, "Louisiana"], [23, "Maine"],
  [24, "Maryland"], [25, "Massachusetts"], [26, "Michigan"], [27, "Minnesota"],
  [28, "Mississippi"], [29, "Missouri"], [30, "Montana"], [31, "Nebraska"],
  [32, "Nevada"], [33, "New Hampshire"], [34, "New Jersey"], [35, "New Mexico"],
  [36, "New York"], [37, "North Carolina"], [38, "North Dakota"], [39, "Ohio"],
  [40, "Oklahoma"], [41, "Oregon"], [42, "Pennsylvania"], [44, "Rhode Island"],
  [45, "South Carolina"], [46, "South Dakota"], [47, "Tennessee"], [48, "Texas"],
  [49, "Utah"], [50, "Vermont"], [51, "Virginia"], [53, "Washington"],
  [54, "West Virginia"], [55, "Wisconsin"], [56, "Wyoming"]
]);

async function scene1() {
  clearScene();
  d3.select("h2").text("Scene 1: U.S. State GDP in 2024");
  backButton.style("display", "none");

  try {
    const [usTopo, gdpData] = await Promise.all([
      d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"),
      d3.json("state_gdp_2024.json")
    ]);

    const states = topojson.feature(usTopo, usTopo.objects.states).features;

    const gdpMap = new Map(gdpData.map(d => [d.state.trim(), d.gdp_2024]));

    const color = d3.scaleSequential()
      .domain([0, d3.max(gdpData, d => d.gdp_2024)])
      .interpolator(d3.interpolateBlues);

    svg.append("g")
      .selectAll("path")
      .data(states)
      .join("path")
      .attr("d", path)
      .attr("fill", d => {
        const stateName = stateNameMap.get(+d.id);
        const gdp = gdpMap.get(stateName);
        return gdp ? color(gdp) : "#eee";
      })
      .attr("stroke", "#999")
      .on("mousemove", (event, d) => {
        const stateName = stateNameMap.get(+d.id);
        const gdp = gdpMap.get(stateName);
        tooltip
          .style("opacity", 1)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY + 10) + "px")
          .html(`
            <strong>${stateName ?? "Unknown"}</strong><br/>
            GDP 2024: $${gdp ? gdp.toLocaleString() + " M" : "No data"}
          `);
      })
      .on("mouseout", () => tooltip.style("opacity", 0))
      .on("click", (event, d) => {
        const stateName = stateNameMap.get(+d.id);
        if (stateName) scene2(stateName);
      });

  } catch (err) {
    console.error("Error loading Scene 1:", err);
  }
}

async function scene2(stateName) {
  d3.select("h2").text(`GDP Breakdown for ${stateName}`);
  d3.select("#chart").html(""); // Clear previous chart

  const raw = await d3.csv("GDP_2013-2024.csv");

  const years = Object.keys(raw[0]).filter(k => /^20\d{2}$/.test(k));
  
  // Filter rows for selected state & exclude "All industry total"
  const filtered = raw.filter(d =>
    d.GeoName.trim().toLowerCase() === stateName.toLowerCase() &&
    d.LineCode !== "1"
  );

  if (filtered.length === 0) {
    d3.select("#chart").append("p").text("No data found for " + stateName);
    return;
  }

  // Convert rows into objects suitable for stacking
  const industryData = filtered.map(d => {
    const result = { industry: d.Description.trim() };
    years.forEach(year => {
      const val = d[year].replace("(NA)", "").trim();
      result[year] = val === "" ? 0 : +val;
    });
    return result;
  });

  const stack = d3.stack()
    .keys(years)
    .order(d3.stackOrderNone)
    .offset(d3.stackOffsetNone);

  const stackedData = stack(industryData);

  // Create chart
  const width = 800;
  const height = 400;
  const margin = { top: 50, right: 30, bottom: 50, left: 80 };

  const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const x = d3.scaleBand()
    .domain(years)
    .range([margin.left, width - margin.right])
    .padding(0.1);

  const y = d3.scaleLinear()
    .domain([
      0,
      d3.max(stackedData, layer =>
        d3.max(layer, d => d[1])
      )
    ])
    .nice()
    .range([height - margin.bottom, margin.top]);

  const color = d3.scaleOrdinal()
    .domain(industryData.map(d => d.industry))
    .range(d3.schemeCategory10);

  svg.append("g")
    .selectAll("g")
    .data(stackedData)
    .join("g")
    .attr("fill", (d, i) => color(d.key))
    .selectAll("rect")
    .data(d => d)
    .join("rect")
    .attr("x", (d, i) => x(years[i]))
    .attr("y", d => y(d[1]))
    .attr("height", d => y(d[0]) - y(d[1]))
    .attr("width", x.bandwidth());

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x));

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));

  // Add industry labels
  const legend = svg.append("g")
    .attr("transform", `translate(${width - margin.right - 150}, ${margin.top})`);

  industryData.forEach((d, i) => {
    const g = legend.append("g").attr("transform", `translate(0, ${i * 20})`);
    g.append("rect").attr("width", 15).attr("height", 15).attr("fill", color(d.industry));
    g.append("text")
      .attr("x", 20)
      .attr("y", 12)
      .text(d.industry)
      .style("font-size", "12px");
  });

  // Add back button
  d3.select("#chart").append("button")
    .text("← Back to Map")
    .on("click", () => {
      d3.select("#chart").html("");
      d3.select("h2").text("U.S. State GDP by Industry (2024)");
      scene1();
    });
}

backButton.on("click", () => scene1());

scene1();
