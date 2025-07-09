const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('USDXToken', function () {
    let usdxToken;
    let owner;
    let addr1;
    let addr2;
    let addr3;
    let addrs;

    beforeEach(async function () {
        [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

        const USDXToken = await ethers.getContractFactory('USDXToken');
        usdxToken = await upgrades.deployProxy(
            USDXToken,
            [
                'USDX Stablecoin',
                'USDX',
                ethers.parseUnits('1000000', 6),
                owner.address
            ],
            { initializer: 'initialize', kind: 'uups' }
        );
    });

    describe('Deployment', function () {
        it('Should set the right name and symbol', async function () {
            expect(await usdxToken.name()).to.equal('USDX Stablecoin');
            expect(await usdxToken.symbol()).to.equal('USDX');
        });

        it('Should have 6 decimals', async function () {
            expect(await usdxToken.decimals()).to.equal(6);
        });

        it('Should grant roles to deployer', async function () {
            const DEFAULT_ADMIN_ROLE = await usdxToken.DEFAULT_ADMIN_ROLE();
            const MINTER_ROLE = await usdxToken.MINTER_ROLE();
            const BURNER_ROLE = await usdxToken.BURNER_ROLE();

            expect(await usdxToken.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
            expect(await usdxToken.hasRole(MINTER_ROLE, owner.address)).to.be.true;
            expect(await usdxToken.hasRole(BURNER_ROLE, owner.address)).to.be.true;
        });

        it('Should mint initial supply to owner', async function () {
            const initialSupply = ethers.parseUnits('1000000', 6);
            expect(await usdxToken.totalSupply()).to.equal(initialSupply);
            expect(await usdxToken.balanceOf(owner.address)).to.equal(initialSupply);
        });
    });

    describe('ERC-1404 Compliance', function () {
        it('Should detect no restriction for normal transfer', async function () {
            await usdxToken.setKYCVerified(owner.address, true);
            await usdxToken.setKYCVerified(addr1.address, true);
            
            const restrictionCode = await usdxToken.detectTransferRestriction(
                owner.address,
                addr1.address,
                ethers.parseUnits('100', 6)
            );
            expect(restrictionCode).to.equal(0);
        });

        it('Should detect blacklisted sender', async function () {
            await usdxToken.setKYCVerified(owner.address, true);
            await usdxToken.setKYCVerified(addr1.address, true);
            await usdxToken.setBlacklisted(owner.address, true);
            
            const restrictionCode = await usdxToken.detectTransferRestriction(
                owner.address,
                addr1.address,
                ethers.parseUnits('100', 6)
            );
            expect(restrictionCode).to.equal(2);
        });

        it('Should detect blacklisted receiver', async function () {
            await usdxToken.setKYCVerified(owner.address, true);
            await usdxToken.setKYCVerified(addr1.address, true);
            await usdxToken.setBlacklisted(addr1.address, true);
            
            const restrictionCode = await usdxToken.detectTransferRestriction(
                owner.address,
                addr1.address,
                ethers.parseUnits('100', 6)
            );
            expect(restrictionCode).to.equal(3);
        });

        it('Should detect insufficient balance', async function () {
            await usdxToken.setKYCVerified(owner.address, true);
            await usdxToken.setKYCVerified(addr1.address, true);
            await usdxToken.setKYCVerified(addr2.address, true);
            
            const restrictionCode = await usdxToken.detectTransferRestriction(
                addr1.address,
                addr2.address,
                ethers.parseUnits('100', 6)
            );
            expect(restrictionCode).to.equal(4);
        });

        it('Should detect paused contract', async function () {
            await usdxToken.setKYCVerified(owner.address, true);
            await usdxToken.setKYCVerified(addr1.address, true);
            await usdxToken.pause();
            
            const restrictionCode = await usdxToken.detectTransferRestriction(
                owner.address,
                addr1.address,
                ethers.parseUnits('100', 6)
            );
            expect(restrictionCode).to.equal(5);
        });

        it('Should detect invalid KYC sender', async function () {
            await usdxToken.setKYCVerified(addr1.address, true);
            await usdxToken.setKYCVerified(owner.address, false); // Remove owner's KYC verification
            
            const restrictionCode = await usdxToken.detectTransferRestriction(
                owner.address,
                addr1.address,
                ethers.parseUnits('100', 6)
            );
            expect(restrictionCode).to.equal(6);
        });

        it('Should detect invalid KYC receiver', async function () {
            await usdxToken.setKYCVerified(owner.address, true);
            
            const restrictionCode = await usdxToken.detectTransferRestriction(
                owner.address,
                addr1.address,
                ethers.parseUnits('100', 6)
            );
            expect(restrictionCode).to.equal(7);
        });

        it('Should return proper restriction messages', async function () {
            const message0 = await usdxToken.messageForTransferRestriction(0);
            const message1 = await usdxToken.messageForTransferRestriction(1);
            const message2 = await usdxToken.messageForTransferRestriction(2);

            expect(message0).to.equal('Transfer allowed');
            expect(message1).to.equal('Transfer failed');
            expect(message2).to.equal('Sender address is blacklisted');
        });
    });

    describe('Minting', function () {
        it('Should allow minting by minter role', async function () {
            const mintAmount = ethers.parseUnits('1000', 6);
            await usdxToken.setKYCVerified(addr1.address, true);
            
            await usdxToken.mint(addr1.address, mintAmount);
            expect(await usdxToken.balanceOf(addr1.address)).to.equal(mintAmount);
        });

        it('Should not allow minting by non-minter', async function () {
            const mintAmount = ethers.parseUnits('1000', 6);
            await usdxToken.setKYCVerified(addr1.address, true);
            
            await expect(usdxToken.connect(addr1).mint(addr1.address, mintAmount))
                .to.be.reverted;
        });

        it('Should not allow minting to blacklisted address', async function () {
            const mintAmount = ethers.parseUnits('1000', 6);
            await usdxToken.setKYCVerified(addr1.address, true);
            await usdxToken.setBlacklisted(addr1.address, true);
            
            await expect(usdxToken.mint(addr1.address, mintAmount))
                .to.be.reverted;
        });

        it('Should not allow minting to zero address', async function () {
            const mintAmount = ethers.parseUnits('1000', 6);
            
            await expect(usdxToken.mint(ethers.ZeroAddress, mintAmount))
                .to.be.reverted;
        });
    });

    describe('Burning', function () {
        beforeEach(async function () {
            await usdxToken.setKYCVerified(addr1.address, true);
            await usdxToken.mint(addr1.address, ethers.parseUnits('1000', 6));
        });

        it('Should allow burning by token holder', async function () {
            const burnAmount = ethers.parseUnits('500', 6);
            
            await usdxToken.connect(addr1).burn(burnAmount);
            expect(await usdxToken.balanceOf(addr1.address)).to.equal(
                ethers.parseUnits('500', 6)
            );
        });

        it('Should not allow burning more than balance', async function () {
            const burnAmount = ethers.parseUnits('1500', 6);
            
            await expect(usdxToken.connect(addr1).burn(burnAmount))
                .to.be.reverted;
        });

        it('Should allow burning by burner role', async function () {
            const burnAmount = ethers.parseUnits('500', 6);
            
            await usdxToken.burnFrom(addr1.address, burnAmount);
            expect(await usdxToken.balanceOf(addr1.address)).to.equal(
                ethers.parseUnits('500', 6)
            );
        });

        it('Should not allow burning by non-burner', async function () {
            const burnAmount = ethers.parseUnits('500', 6);
            
            await expect(usdxToken.connect(addr2).burnFrom(addr1.address, burnAmount))
                .to.be.reverted;
        });
    });

    describe('Blacklisting', function () {
        it('Should allow blacklisting by blacklister role', async function () {
            await usdxToken.setBlacklisted(addr1.address, true);
            expect(await usdxToken.isBlacklisted(addr1.address)).to.be.true;
        });

        it('Should not allow blacklisting by non-blacklister', async function () {
            await expect(usdxToken.connect(addr1).setBlacklisted(addr2.address, true))
                .to.be.reverted;
        });

        it('Should prevent transfers from blacklisted address', async function () {
            await usdxToken.setKYCVerified(owner.address, true);
            await usdxToken.setKYCVerified(addr1.address, true);
            await usdxToken.setBlacklisted(owner.address, true);
            
            await expect(usdxToken.transfer(addr1.address, ethers.parseUnits('100', 6)))
                .to.be.reverted;
        });

        it('Should prevent transfers to blacklisted address', async function () {
            await usdxToken.setKYCVerified(owner.address, true);
            await usdxToken.setKYCVerified(addr1.address, true);
            await usdxToken.setBlacklisted(addr1.address, true);
            
            await expect(usdxToken.transfer(addr1.address, ethers.parseUnits('100', 6)))
                .to.be.reverted;
        });

        it('Should remove blacklist status', async function () {
            await usdxToken.setBlacklisted(addr1.address, true);
            expect(await usdxToken.isBlacklisted(addr1.address)).to.be.true;
            
            await usdxToken.setBlacklisted(addr1.address, false);
            expect(await usdxToken.isBlacklisted(addr1.address)).to.be.false;
        });
    });

    describe('KYC Verification', function () {
        it('Should allow KYC verification by compliance role', async function () {
            await usdxToken.setKYCVerified(addr1.address, true);
            expect(await usdxToken.isKYCVerified(addr1.address)).to.be.true;
        });

        it('Should not allow KYC verification by non-compliance role', async function () {
            await expect(usdxToken.connect(addr1).setKYCVerified(addr2.address, true))
                .to.be.reverted;
        });

        it('Should prevent transfers without KYC verification', async function () {
            await usdxToken.setKYCVerified(owner.address, true);
            
            await expect(usdxToken.transfer(addr1.address, ethers.parseUnits('100', 6)))
                .to.be.reverted;
        });

        it('Should allow transfers with KYC verification', async function () {
            await usdxToken.setKYCVerified(owner.address, true);
            await usdxToken.setKYCVerified(addr1.address, true);
            
            await usdxToken.transfer(addr1.address, ethers.parseUnits('100', 6));
            expect(await usdxToken.balanceOf(addr1.address)).to.equal(
                ethers.parseUnits('100', 6)
            );
        });
    });

    describe('Daily Transfer Limits', function () {
        beforeEach(async function () {
            await usdxToken.setKYCVerified(owner.address, true);
            await usdxToken.setKYCVerified(addr1.address, true);
            await usdxToken.setDailyTransferLimit(owner.address, ethers.parseUnits('500', 6));
        });

        it('Should allow transfers within daily limit', async function () {
            await usdxToken.transfer(addr1.address, ethers.parseUnits('300', 6));
            expect(await usdxToken.balanceOf(addr1.address)).to.equal(
                ethers.parseUnits('300', 6)
            );
        });

        it('Should prevent transfers exceeding daily limit', async function () {
            await usdxToken.transfer(addr1.address, ethers.parseUnits('300', 6));
            
            await expect(usdxToken.transfer(addr1.address, ethers.parseUnits('300', 6)))
                .to.be.reverted;
        });

        it('Should allow multiple transfers within limit', async function () {
            await usdxToken.transfer(addr1.address, ethers.parseUnits('200', 6));
            await usdxToken.transfer(addr1.address, ethers.parseUnits('200', 6));
            
            expect(await usdxToken.balanceOf(addr1.address)).to.equal(
                ethers.parseUnits('400', 6)
            );
        });

        it('Should track daily transfer amounts', async function () {
            await usdxToken.transfer(addr1.address, ethers.parseUnits('300', 6));
            
            const dailyAmount = await usdxToken.getDailyTransferAmount(owner.address);
            expect(dailyAmount).to.equal(ethers.parseUnits('300', 6));
        });
    });

    describe('Pausing', function () {
        it('Should allow pausing by pauser role', async function () {
            await usdxToken.pause();
            expect(await usdxToken.paused()).to.be.true;
        });

        it('Should not allow pausing by non-pauser', async function () {
            await expect(usdxToken.connect(addr1).pause())
                .to.be.reverted;
        });

        it('Should prevent transfers when paused', async function () {
            await usdxToken.setKYCVerified(owner.address, true);
            await usdxToken.setKYCVerified(addr1.address, true);
            await usdxToken.pause();
            
            await expect(usdxToken.transfer(addr1.address, ethers.parseUnits('100', 6)))
                .to.be.reverted;
        });

        it('Should allow unpausing', async function () {
            await usdxToken.pause();
            await usdxToken.unpause();
            expect(await usdxToken.paused()).to.be.false;
        });
    });

    describe('Sanctions', function () {
        it('Should allow sanctioning by compliance role', async function () {
            await usdxToken.setSanctioned(addr1.address, true);
            expect(await usdxToken.isSanctioned(addr1.address)).to.be.true;
        });

        it('Should not allow sanctioning by non-compliance role', async function () {
            await expect(usdxToken.connect(addr1).setSanctioned(addr2.address, true))
                .to.be.reverted;
        });

        it('Should prevent transfers involving sanctioned addresses', async function () {
            await usdxToken.setKYCVerified(owner.address, true);
            await usdxToken.setKYCVerified(addr1.address, true);
            await usdxToken.setSanctioned(addr1.address, true);
            
            await expect(usdxToken.transfer(addr1.address, ethers.parseUnits('100', 6)))
                .to.be.reverted;
        });
    });

    describe('View Functions', function () {
        it('Should return correct transfer limits', async function () {
            expect(await usdxToken.getMaxTransferAmount()).to.equal(
                ethers.parseUnits('1000000', 6)
            );
            expect(await usdxToken.getMinTransferAmount()).to.equal(
                ethers.parseUnits('1', 6)
            );
        });

        it('Should return correct holder limits', async function () {
            expect(await usdxToken.getMaxHolderCount()).to.equal(2000);
            expect(await usdxToken.getCurrentHolderCount()).to.equal(1);
        });

        it('Should return correct KYC requirements', async function () {
            expect(await usdxToken.isKYCRequired()).to.be.true;
            expect(await usdxToken.isWhitelistEnabled()).to.be.true;
            expect(await usdxToken.isRegionRestrictionsEnabled()).to.be.false;
        });
    });
}); 