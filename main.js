let currentScene = 0;
const svg = d3.select("#viz");
const width = +svg.attr("width");
const height = +svg.attr("height");

const scenes = [scene1, scene2, scene3];

function clearScene() {
  svg.selectAll("*").remove();
}

function scene1() {
  clearScene();
  d3.select("#subtitle").text("Scene 1: Overview of Global CO2 Emissions");
  // Mock visualization - add your world map or similar here
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height / 2)
    .attr("text-anchor", "middle")
    .attr("font-size", "24px")
    .text("[Map showing emissions by country]");
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

