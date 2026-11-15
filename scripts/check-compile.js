const fs = require("fs");
const path = require("path");

const outputPath = path.join(__dirname, "..", "build", "output.json");
if (!fs.existsSync(outputPath)) {
  console.error("Missing build/output.json. Run the Solidity compiler first.");
  process.exit(1);
}

const raw = fs.readFileSync(outputPath, "utf8");
const jsonStart = raw.indexOf("{");
if (jsonStart < 0) {
  console.error("Compiler produced no JSON output.");
  process.exit(1);
}

let output;
try {
  output = JSON.parse(raw.slice(jsonStart));
} catch (error) {
  console.error("Could not parse solc output:", error.message);
  process.exit(1);
}

const errors = (output.errors || []).filter((item) => item.severity === "error");
if (errors.length) {
  for (const error of errors) console.error(error.formattedMessage || error.message);
  process.exit(1);
}

const contracts = Object.values(output.contracts || {}).flatMap((source) =>
  Object.entries(source).map(([name, artifact]) => ({ name, artifact }))
);
const deployable = contracts.filter(({ artifact }) => artifact.evm?.bytecode?.object);

if (!deployable.length) {
  console.error("Compilation completed, but no deployable contract bytecode was produced.");
  process.exit(1);
}

console.log("Solidity compilation successful.");
console.log("Deployable contracts:", deployable.map(({ name }) => name).join(", "));
