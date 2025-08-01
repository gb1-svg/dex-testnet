// test/TokenFactory.ts

import { expect } from "chai";
import { ethers } from "hardhat";
import { TokenFactory, Token, BondingCurve } from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("TokenFactory", function () {
    let tokenFactory: TokenFactory;
    let owner: SignerWithAddress;
    let addr1: SignerWithAddress;
    let addr2: SignerWithAddress;
    const launchFee = ethers.parseEther("0.01"); // Komentar: Menggunakan 0.01 MON sebagai biaya.

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();

        const TokenFactoryFactory = await ethers.getContractFactory("TokenFactory");
        tokenFactory = await TokenFactoryFactory.deploy();
        await tokenFactory.waitForDeployment();
    });

    describe("Token Launch", function () {
        it("should allow a new token launch with correct fee and metadata", async function () {
            // Komentar: Mengirim token native ($MON) secara langsung dengan transaksi.
            await expect(tokenFactory.connect(addr1).launchNewToken("My Token", "MTK", { value: launchFee }))
                .to.emit(tokenFactory, "TokenLaunched");

            const tokenInfo = await tokenFactory.tokenInfos(await tokenFactory.tokenInfos(addr1.address).tokenAddress);
            expect(tokenInfo.name).to.equal("My Token");
            expect(tokenInfo.symbol).to.equal("MTK");
            expect(tokenInfo.creator).to.equal(addr1.address);
        });

        it("should fail if fee is not sent", async function () {
            // Komentar: Menghilangkan `value: launchFee` dari transaksi.
            await expect(tokenFactory.connect(addr1).launchNewToken("Another Token", "ATK", { value: 0 }))
                .to.be.revertedWith("Incorrect launch fee");
        });

        it("should fail if fee is less than required", async function () {
            // Komentar: Mengirim nilai yang kurang dari biaya yang dibutuhkan.
            await expect(tokenFactory.connect(addr1).launchNewToken("Another Token", "ATK", { value: launchFee - 1 }))
                .to.be.revertedWith("Incorrect launch fee");
        });

        it("should transfer fee to the feeCollector", async function () {
            const initialBalance = await ethers.provider.getBalance(owner.address);
            const tx = await tokenFactory.connect(addr1).launchNewToken("Fee Token", "FTK", { value: launchFee });
            await tx.wait();
            
            // Komentar: Biaya dikumpulkan oleh kontrak dan dapat ditarik oleh owner.
            const contractBalance = await ethers.provider.getBalance(await tokenFactory.getAddress());
            expect(contractBalance).to.equal(launchFee);

            // Komentar: Penarikan biaya oleh pemilik kontrak.
            await expect(tokenFactory.withdrawFees(owner.address))
                .to.changeEtherBalance(owner, launchFee);
        });
    });

    // ... sisanya dari tes lainnya bisa dipertahankan atau disesuaikan ...
});
