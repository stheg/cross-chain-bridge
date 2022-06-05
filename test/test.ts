import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { deployContract } from "ethereum-waffle";
import { ethers, network } from "hardhat";
import { ERC20PresetMinterPauser, ERC20PresetMinterPauser__factory, MABridge } from "../typechain-types";

describe("MA Bridge", () => {
    let validator: SignerWithAddress;
    let user1: SignerWithAddress;
    let user2: SignerWithAddress;
    let contract: MABridge;
    let tokenFrom: ERC20PresetMinterPauser;
    let tokenTo: ERC20PresetMinterPauser;

    let nonce = 1;

    const dAmount = 1000;

    beforeEach(async () => {
        [validator, user1, user2] = await ethers.getSigners();

        tokenFrom = <ERC20PresetMinterPauser>await deployContract(
            validator, 
            ERC20PresetMinterPauser__factory, 
            ["TF", "TF"]
        );
        await tokenFrom.mint(user1.address, dAmount);
        await tokenFrom.mint(user2.address, dAmount);
        
        tokenTo = <ERC20PresetMinterPauser>await deployContract(
            validator, 
            ERC20PresetMinterPauser__factory, 
            ["TT", "TT"]
        );
        await tokenTo.mint(user1.address, dAmount);
        await tokenTo.mint(user2.address, dAmount);


        const f = await ethers.getContractFactory("MABridge", validator);
        contract = <MABridge>await f.deploy(tokenFrom.address, tokenTo.address);

        await contract.deployed();

        await contract.setValidator(validator.address);

        await tokenFrom.grantRole(await tokenFrom.MINTER_ROLE(), contract.address);
        await tokenTo.grantRole(await tokenTo.MINTER_ROLE(), contract.address);
    })

    describe("swap", () => {
        it("should work", async () => {
            const amount = 10;

            await tokenFrom.connect(user1).approve(contract.address, amount);

            await contract.connect(user1).swap(
                amount, user2.address, network.config.chainId ?? 0
            );

            const after = await tokenFrom.connect(user1).balanceOf(user1.address);
            expect(after).eq(dAmount - amount);
        });

        it("should emit event", async () => {
            const amount = 10;

            await tokenFrom.connect(user1).approve(contract.address, amount);

            const tx = contract.connect(user1).swap(
                amount, user2.address, network.config.chainId ?? 0
            );

            await expect(tx).to.emit(contract, "SwapInitialized")
                .withArgs(
                    user1.address, tokenFrom.address, network.config.chainId,
                    amount,
                    user2.address, tokenTo.address, network.config.chainId
                );
        });
    });

    describe("redeem", () => {
        it("should work", async () => {
            const amount = 10;
            const [nonce, signature] = await testSign(
                user1,
                amount,
                user2
            );

            await contract.connect(user2).redeem(
                nonce,
                user1.address, network.config.chainId ?? 0,
                amount,
                ethers.utils.arrayify(signature)
            );

            const after = await tokenTo.balanceOf(user2.address);
            expect(after).eq(dAmount + amount);
        });

        it("should revert if signature from a wrong validator", async () => {
            const amount = 10;
            const [nonce, signature] = await testSign(
                user1,
                amount - 5,
                user2
            );

            await contract.setValidator(user1.address);

            const tx = contract.connect(user2).redeem(
                nonce,
                user1.address, network.config.chainId ?? 0,
                amount,
                ethers.utils.arrayify(signature)
            );
            await expect(tx).to.be.revertedWith("MABridge: wrong signature");
        });

        it("should revert if signature based on different msg", async () => {
            const amount = 10;
            const [nonce, signature] = await testSign(
                user1,
                amount-5,
                user2
            );

            const tx = contract.connect(user2).redeem(
                nonce,
                user1.address, network.config.chainId ?? 0,
                amount,
                ethers.utils.arrayify(signature)
            );
            await expect(tx).to.be.revertedWith("MABridge: wrong signature");
        });

        it("should revert if requested second time", async () => {
            const amount = 10;
            const [nonce, signature] = await testSign(
                user1,
                amount,
                user2
            );

            await contract.connect(user2).redeem(
                nonce,
                user1.address, network.config.chainId ?? 0,
                amount, 
                ethers.utils.arrayify(signature)
            );

            const tx = contract.connect(user2).redeem(
                nonce,
                user1.address, network.config.chainId ?? 0,
                amount,
                ethers.utils.arrayify(signature)
            );

            await expect(tx).to.be.revertedWith("MABridge: already completed");
        });
    });

    async function testSign(
        from: SignerWithAddress, 
        amount: number, 
        to: SignerWithAddress
    ): Promise<[number, string]> {
        let msg = ethers.utils.keccak256(ethers.utils.arrayify(
            ethers.utils.defaultAbiCoder.encode(
                [
                    "uint256", 
                    "address", "address", "uint256", 
                    "uint256", 
                    "address", "address", "uint256"
                ],
                [
                    nonce++,
                    from.address, tokenFrom.address, network.config.chainId,
                    amount,
                    to.address, tokenTo.address, network.config.chainId 
                ]
            )
        ));
        let msgBytes = ethers.utils.arrayify(msg);
        let signature = await validator.signMessage(msgBytes);
        return [nonce - 1, signature];
    }
});