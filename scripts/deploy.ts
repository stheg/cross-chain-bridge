import { ethers } from "hardhat";

async function main() {
    const contractName = "MABridge";

    const [owner] = await ethers.getSigners();
    const tokenA = "0x1A13F7fB13BCa03FF646702C6Af9D699729A0C1d";
    const tokenB = "0x1A13F7fB13BCa03FF646702C6Af9D699729A0C1d";

    const factory = await ethers.getContractFactory(contractName, owner);
    const contract = await factory.deploy(tokenA, tokenB);
    await contract.deployed();

    console.log(
        contractName +
        " deployed with (" +
        "no params" +
        ") to: " +
        contract.address
    );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
