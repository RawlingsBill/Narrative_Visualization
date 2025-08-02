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
          .html(`<strong>${stateName ?? "Unknown"}</strong><br/>
                 GDP 2024: $${gdp ? gdp.toLocaleString() + " M" : "No data"}`);
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

// Scene 2: State Industry Breakdown
async function scene2(state) {
  clearScene();
  d3.select("h2").text(`Scene 2: ${state} GDP by Industry Over Time`);
  backButton.style("display", "inline-block").on("click", () => {
    backButton.style("display", "none");
    scene1();
  });

  const raw = await d3.json("state_industry_gdp_long.json");

  const stateData = raw.filter(d =>
    d.state === state && d.industry !== "All industry total"
  );

  if (stateData.length === 0) {
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .text(`No data available for ${state}`);
    return;
  }

  // Prepare pivoted stacked data
  const years = [...new Set(stateData.map(d => +d.year))].sort((a, b) => a - b);
  const industries = [...new Set(stateData.map(d => d.industry))];

  const dataByYear = d3.groups(stateData, d => +d.year);
  const stackedData = dataByYear.map(([year, entries]) => {
    const obj = { year };
    industries.forEach(ind => obj[ind] = 0); // fill missing with 0
    entries.forEach(d => obj[d.industry] = +d.gdp || 0);
    return obj;
  });

  const stack = d3.stack()
    .keys(industries)
    .offset(d3.stackOffsetNone); // Change to d3.stackOffsetExpand for percent chart

  const series = stack(stackedData);

  // Dimensions
  const margin = { top: 40, right: 180, bottom: 40, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Clear and reset SVG
  svg.attr("width", width).attr("height", height);
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand()
    .domain(years)
    .range([0, innerWidth])
    .padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, d3.max(stackedData, d => d3.sum(industries, k => d[k] || 0))])
    .nice()
    .range([innerHeight, 0]);

  const color = d3.scaleOrdinal()
    .domain(industries)
    .range(d3.schemeTableau10.concat(d3.schemeSet3));

  g.selectAll("g.layer")
    .data(series)
    .join("g")
    .attr("fill", d => color(d.key))
    .selectAll("rect")
    .data(d => d)
    .join("rect")
    .attr("x", d => x(d.data.year))
    .attr("y", d => y(d[1]))
    .attr("height", d => {
      const h = y(d[0]) - y(d[1]);
      return isNaN(h) ? 0 : h;
    })
    .attr("width", x.bandwidth())
    .selectAll("rect")
    .data(d => d.layer.map((v, i) => ({ ...v, industry: d.industry })))  // Bind industry explicitly
    .join("rect")
    .attr("x", d => x(d.data.year))
    .attr("y", d => y(d[1]))
    .attr("height", d => {
      const h = y(d[0]) - y(d[1]);
      return isNaN(h) ? 0 : h;
    })
    .attr("width", x.bandwidth())
    .append("title")
    .text(d => {
      const industry = d.industry ?? "UNKNOWN";
      const year = d.data.year;
      const value = d[1] - d[0];
      return `${industry}\n${year}: $${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} M`;
    });



  // Axes
  g.append("g")
    .attr("transform", `translate(0, ${innerHeight})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")));

  g.append("g")
    .call(d3.axisLeft(y).ticks(6));

  // Legend
  const legend = svg.append("g")
    .attr("transform", `translate(${margin.left + innerWidth + 10}, ${margin.top})`);

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

  backButton.style("display", "inline-block")
    .text("Back to Map")
    .on("click", () => {
      backButton.style("display", "none");
      deepDiveButton.style("display", "none");
      scene1();
  });

const deepDiveButton = d3.select("#deep-dive-button");
deepDiveButton.style("display", "inline-block")
  .text("Focus: Top 5 Industries")
  .on("click", () => scene3(state));
}

async function scene3(state) {
  clearScene();
  d3.select("h2").text(`Scene 3: ${state} – Top 5 Industries Over Time`);
  backButton.style("display", "inline-block")
  .text("Back")
  .on("click", () => scene2(state))

  try {
    const raw = await d3.json("state_industry_gdp_long.json");

    const filtered = raw.filter(d => d.state === state && d.industry !== "All industry total");
    const latestYear = 2024;
    const topIndustries = Array.from(
      d3.rollup(
        filtered.filter(d => d.year === latestYear),
        v => d3.sum(v, d => d.gdp),
        d => d.industry
      )
    ).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([key]) => key);

    const years = d3.range(2013, 2025);
    const stateData = filtered.filter(d => topIndustries.includes(d.industry));
    const nested = d3.groups(stateData, d => d.year);
    const stackedData = nested.map(([year, entries]) => {
      const row = { year: +year };
      topIndustries.forEach(ind => row[ind] = 0);
      entries.forEach(d => row[d.industry] = d.gdp);
      return row;
    });

    const stack = d3.stack().keys(topIndustries).offset(d3.stackOffsetNone);
    const series = stack(stackedData);

    const margin = { top: 40, right: 180, bottom: 40, left: 60 };
    const widthAdj = width - margin.left - margin.right;
    const heightAdj = height - margin.top - margin.bottom;

    svg.attr("width", width).attr("height", height);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain(d3.extent(years)).range([0, widthAdj]);
    const y = d3.scaleLinear()
      .domain([0, d3.max(series, s => d3.max(s, d => d[1]))])
      .nice()
      .range([heightAdj, 0]);

    const color = d3.scaleOrdinal().domain(topIndustries).range(d3.schemeTableau10);

    const area = d3.area()
      .x(d => x(d.data.year))
      .y0(d => y(d[0]))
      .y1(d => y(d[1]));

    g.selectAll("path")
      .data(series)
      .join("path")
      .attr("fill", d => color(d.key))
      .attr("d", area)
      .append("title")
      .text(d =>
        `${d.key}: ${d3.sum(d, seg => seg[1] - seg[0]).toLocaleString()} M total`
      );

    g.append("g").attr("transform", `translate(0,${heightAdj})`).call(d3.axisBottom(x).tickFormat(d3.format("d")));
    g.append("g").call(d3.axisLeft(y));

    const legend = svg.append("g").attr("transform", `translate(${width - 160},${margin.top})`);
    topIndustries.forEach((ind, i) => {
      const row = legend.append("g").attr("transform", `translate(0,${i * 20})`);
      row.append("rect").attr("width", 12).attr("height", 12).attr("fill", color(ind));
      row.append("text").attr("x", 18).attr("y", 10).text(ind).style("font-size", "12px");
    });

  } catch (err) {
    console.error("Error loading Scene 3:", err);
  }
}

backButton.on("click", () => scene1());
scene1();
