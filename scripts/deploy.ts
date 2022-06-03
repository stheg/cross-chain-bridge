import { ethers } from "hardhat";

async function main() {
    const contractName = "MABridge";

    const [owner] = await ethers.getSigners();
    const factory = await ethers.getContractFactory(contractName, owner);
    const d = factory.deploy();
    const contract = await d;
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
