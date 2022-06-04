import { task } from "hardhat/config";

task("swap", "Initializes swap procedure and burns tokens")
    .addParam("contract", "Address of the bridge token")
    .addParam("token1", "Address of the first token (which will be burnt in current)")
    .addParam("token2", "Address of the second token (which will be minted in another chain)")
    .addParam("amount", "Amount to burn and mint")
    .addOptionalParam("chain2", "Id of another chain where tokens will be minted")
    .addFlag("approve", "Approves amount of token1 for the bridge contract to burn them")
    .setAction(async (args, hre) => {
        const [owner, user1, user2] = await hre.ethers.getSigners();
        const contract = 
            await hre.ethers.getContractAt("MABridge", args.contract, owner);
        
        const token1 =
            await hre.ethers.getContractAt("ERC20PresetMinterPauser", args.token1, user1);
        
        if (args.approve)
            await token1.approve(contract.address, args.amount);

        await contract.connect(user1).swap(
            token1.address, 
            args.amount, 
            user2.address, 
            args.token2, 
            args.chain2 ?? hre.network.config.chainId
        );
    });

task("redeem", "Finishes swap procedure and mints tokens")
    .addParam("contract", "Address of the bridge token")
    .addParam("token1", "Address of the first token (which will be burnt in current)")
    .addParam("token2", "Address of the second token (which will be minted in another chain)")
    .addParam("amount", "Amount to burn and mint")
    .addParam("signature", "Signature from the validator to ensure the request is valid")
    .addOptionalParam("chain1", "Id of the source chain where tokens has been burnt")
    .setAction(async (args, hre) => {
        const [owner, user1, user2] = await hre.ethers.getSigners();
        const contract =
            await hre.ethers.getContractAt("MABridge", args.contract, owner);

        const token2 =
            await hre.ethers.getContractAt("ERC20PresetMinterPauser", args.token2, user2);

        //uncomment the next line if owner can grant the role to the bridge contract
        //await token1.connect(owner).grantRole(await token1.MINTER_ROLE(), contract.address);

        await contract.connect(user2).redeem(
            user1.address,
            args.token1,
            args.chain1 ?? hre.network.config.chainId,
            args.amount,
            token2.address,
            hre.ethers.utils.arrayify(args.signature)
        );
    });

task("set-validator", "Inits a new validator to verify signature")
    .addParam("contract", "Address of the bridge token")
    .addOptionalParam("validator", "Address of the validator")
    .setAction(async (args, hre) => {
        const [owner] = await hre.ethers.getSigners();
        const contract =
            await hre.ethers.getContractAt("MABridge", args.contract, owner);

        await contract.setValidator(args.validator ?? owner.address);
    });