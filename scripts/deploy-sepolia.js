const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL || process.env.RPC_URL;
  const privateKey = process.env.SEPOLIA_PRIVATE_KEY || process.env.PRIVATE_KEY;
  const contractName = process.env.CONTRACT_NAME || "helloworld";

  if (!rpcUrl) throw new Error("Missing SEPOLIA_RPC_URL (or RPC_URL) secret.");
  if (!privateKey) throw new Error("Missing SEPOLIA_PRIVATE_KEY (or PRIVATE_KEY) secret.");

  const outputPath = path.join(__dirname, "..", "build", "output.json");
  const raw = fs.readFileSync(outputPath, "utf8");
  const jsonStart = raw.indexOf("{");
  if (jsonStart < 0) throw new Error("build/output.json does not contain compiler JSON.");

  const output = JSON.parse(raw.slice(jsonStart));
  const errors = (output.errors || []).filter((item) => item.severity === "error");
  if (errors.length) {
    throw new Error(errors.map((item) => item.formattedMessage || item.message).join("\n"));
  }

  let selected;
  for (const [sourceName, sourceContracts] of Object.entries(output.contracts || {})) {
    if (sourceContracts[contractName]) {
      selected = { sourceName, artifact: sourceContracts[contractName] };
      break;
    }
  }
  if (!selected) {
    const available = Object.values(output.contracts || {}).flatMap((items) => Object.keys(items));
    throw new Error(`Contract "${contractName}" not found. Available: ${available.join(", ")}`);
  }

  const bytecode = selected.artifact.evm?.bytecode?.object;
  if (!bytecode) throw new Error(`Contract "${contractName}" has no deployment bytecode.`);

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const network = await provider.getNetwork();
  if (network.chainId !== 11155111n) {
    throw new Error(`Wrong network: expected Sepolia (11155111), received ${network.chainId}.`);
  }

  const wallet = new ethers.Wallet(privateKey, provider);
  const balance = await provider.getBalance(wallet.address);
  if (balance === 0n) throw new Error(`Deployer ${wallet.address} has no Sepolia ETH for gas.`);

  console.log(`Deploying ${contractName} from ${selected.sourceName} to Sepolia.`);
  console.log(`Deployer: ${wallet.address}`);
  const factory = new ethers.ContractFactory(selected.artifact.abi, "0x" + bytecode, wallet);
  const contract = await factory.deploy();
  const tx = contract.deploymentTransaction();
  console.log(`Deployment transaction: ${tx.hash}`);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  const receipt = await tx.wait();
  console.log("SEPOLIA_DEPLOYMENT_SUCCESS");
  console.log(`Contract: ${contractName}`);
  console.log(`Address: ${address}`);
  console.log(`Transaction: ${tx.hash}`);
  console.log(`Block: ${receipt.blockNumber}`);
  console.log(`Explorer: https://sepolia.etherscan.io/address/${address}`);
}

main().catch((error) => {
  console.error("Sepolia deployment failed:", error.message || error);
  process.exit(1);
});
