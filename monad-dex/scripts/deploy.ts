// scripts/deploy.ts

import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts to Monad Testnet with the account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Komentar: Menggunakan alamat WMON yang Anda berikan.
  const wmonAddress = "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701";

  // Langkah 1: Deploy MockDexFactory.sol
  console.log("Deploying MockDexFactory contract...");
  const MockDexFactory = await ethers.getContractFactory("MockDexFactory");
  const dexFactory = await MockDexFactory.deploy(wmonAddress);
  await dexFactory.waitForDeployment();
  const dexFactoryAddress = await dexFactory.getAddress();
  console.log("MockDexFactory deployed to:", dexFactoryAddress);

  // Langkah 2: Deploy MockDexRouter dengan alamat factory dan WMON.
  console.log("Deploying MockDexRouter contract...");
  const MockDexRouter = await ethers.getContractFactory("MockDexRouter");
  const dexRouter = await MockDexRouter.deploy(dexFactoryAddress, wmonAddress);
  await dexRouter.waitForDeployment();
  const dexRouterAddress = await dexRouter.getAddress();
  console.log("MockDexRouter deployed to:", dexRouterAddress);

  // Langkah 3: Deploy TokenFactory dengan alamat factory, router, dan WMON.
  console.log("Deploying TokenFactory contract...");
  const TokenFactory = await ethers.getContractFactory("TokenFactory");
  const factory = await TokenFactory.deploy(dexFactoryAddress, dexRouterAddress, wmonAddress);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("TokenFactory deployed to:", factoryAddress);

  console.log("Deployment complete!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});