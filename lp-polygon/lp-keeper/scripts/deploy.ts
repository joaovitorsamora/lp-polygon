/**
 * deploy.ts — Deploy do LPKeeper na Polygon (Mainnet ou Amoy)
 *
 * Uso:
 *   npm run deploy:polygon       ← mainnet (gasta POL real)
 *   npm run deploy:amoy          ← testnet (POL de faucet)
 *   npm run deploy:local         ← hardhat local
 *
 * Pré-requisitos para Polygon Mainnet:
 *   1. PRIVATE_KEY no .env (carteira com POL para gas)
 *   2. RPC_URL no .env (ou usa polygon-rpc.com)
 *   3. KEEPER no .env (endereço da carteira keeper — pode ser a mesma)
 */

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";

// ── Config por rede ───────────────────────────────────────────────────────────

const NETWORK_CONFIGS: Record<string, { rpcUrl: string; chainId: number; name: string }> = {
  polygon: {
    rpcUrl:  process.env.RPC_URL ?? "https://polygon-rpc.com",
    chainId: 137,
    name:    "Polygon Mainnet",
  },
  amoy: {
    rpcUrl:  process.env.AMOY_RPC_URL ?? "https://rpc-amoy.polygon.technology",
    chainId: 80002,
    name:    "Polygon Amoy Testnet",
  },
  local: {
    rpcUrl:  "http://127.0.0.1:8545",
    chainId: 31337,
    name:    "Hardhat Local",
  },
};

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  // Rede passada como argumento: NETWORK=polygon npm run deploy
  const networkKey = process.env.NETWORK ?? "local";
  const netCfg = NETWORK_CONFIGS[networkKey];

  if (!netCfg) {
    console.error(`Rede desconhecida: "${networkKey}". Use: polygon | amoy | local`);
    process.exit(1);
  }

  console.log(`\n🚀 Deploying LPKeeper na ${netCfg.name} (chainId: ${netCfg.chainId})\n`);

  // ── Carregar artifact ───────────────────────────────────────────────────
  const artifact = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../artifacts/LPKeeper.json"), "utf8")
  );

  // ── Provider ────────────────────────────────────────────────────────────
  const provider = new ethers.JsonRpcProvider(netCfg.rpcUrl);

  // ── Deployer ────────────────────────────────────────────────────────────
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey && networkKey !== "local") {
    console.error("❌ PRIVATE_KEY não definida no .env");
    process.exit(1);
  }

  const deployer = networkKey === "local"
    ? new ethers.Wallet(
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
        provider
      )
    : new ethers.Wallet(privateKey!, provider);

  // ── Verificar saldo ─────────────────────────────────────────────────────
  const balance = await provider.getBalance(deployer.address);
  const balanceFormatted = ethers.formatEther(balance);
  console.log(`  Deployer: ${deployer.address}`);
  console.log(`  Saldo:    ${balanceFormatted} POL`);

  if (networkKey === "polygon" && parseFloat(balanceFormatted) < 0.05) {
    console.error(`\n❌ Saldo insuficiente para deploy na mainnet.`);
    console.error(`   Saldo atual: ${balanceFormatted} POL`);
    console.error(`   Mínimo estimado: 0.05 POL`);
    console.error(`   Saldo recomendado para operação: 1–2 POL`);
    process.exit(1);
  }

  // ── Keeper address ──────────────────────────────────────────────────────
  // Em produção: pode ser a mesma wallet que o deployer
  const keeperAddress = process.env.KEEPER ?? deployer.address;
  console.log(`  Keeper:   ${keeperAddress}\n`);

  // ── Estimar gas antes de deployar ───────────────────────────────────────
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? ethers.parseUnits("30", "gwei");
  console.log(`  Gas price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);

  // ── Deploy ──────────────────────────────────────────────────────────────
  const factory  = new ethers.ContractFactory(artifact.abi, artifact.bytecode, deployer);
  const contract = await factory.deploy(keeperAddress, { gasPrice });
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`\n  ✅ LPKeeper deployado em: ${address}`);

  if (networkKey === "polygon") {
    console.log(`  🔗 PolygonScan: https://polygonscan.com/address/${address}`);
  } else if (networkKey === "amoy") {
    console.log(`  🔗 Amoy PolygonScan: https://amoy.polygonscan.com/address/${address}`);
  }

  // ── Salvar deployment.json ───────────────────────────────────────────────
  const deployment = {
    network:     netCfg.name,
    chainId:     netCfg.chainId,
    address,
    deployedAt:  new Date().toISOString(),
    deployer:    deployer.address,
    keeper:      keeperAddress,
  };

  const deploymentFile = path.join(__dirname, `../deployment.${networkKey}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deployment, null, 2));
  console.log(`  📄 ${path.basename(deploymentFile)} salvo`);

  // ── Instruções pós-deploy ────────────────────────────────────────────────
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 PRÓXIMOS PASSOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Adicione no lp-bot/.env:
   KEEPER_CONTRACT=${address}
   CHAIN_ID=${netCfg.chainId}
   RPC_URL=${netCfg.rpcUrl}

2. Inicie o bot em dry-run para verificar conectividade:
   cd lp-bot && DRY_RUN=true npm start

3. Quando pronto para produção:
   DRY_RUN=false npm start
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
}

main().catch(e => {
  console.error("Deploy falhou:", e.message);
  process.exit(1);
});
