# Solidity Vault App — CI/CD to Sepolia

This repository compiles Solidity contracts with **solc 0.8.24** and deploys the `helloworld` contract to **Sepolia** through GitHub Actions.

## Pipeline

1. Runs on every push to `main`, or manually from **Actions → Solidity CI and Sepolia Deploy → Run workflow**.
2. Installs the locked npm dependencies.
3. Generates `build/input.json` from every Solidity file under `contracts/`.
4. Compiles with Docker image `ethereum/solc:0.8.24`.
5. Fails if solc reports an error or no deployment bytecode is generated.
6. Verifies the RPC endpoint is Sepolia (chain ID `11155111`), then deploys `helloworld`.
7. Prints the transaction hash, contract address, block number, and Etherscan link.
8. Uploads `build/` as a workflow artifact.

## GitHub Actions secrets

Create an environment named **sepolia** in **Settings → Environments**. Add these environment secrets:

- `SEPOLIA_RPC_URL`: full Sepolia JSON-RPC HTTPS endpoint.
- `SEPOLIA_PRIVATE_KEY`: private key of the Sepolia deployer wallet.

For compatibility, the workflow also accepts `RPC_URL` and `PRIVATE_KEY`. Never commit or print the private key. The wallet must have Sepolia test ETH.

## Contract selection

The workflow deploys the exact Solidity contract name `helloworld` from the compiler output. Change `CONTRACT_NAME` in `.github/workflows/sepolia.yml` if you intend to deploy a different contract.

## Local compile

```bash
npm ci
npm run prepare-input
docker compose run --rm solc
npm run check-compile
```
