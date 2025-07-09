/**
 * 本地测试配置
 * 包含 Hardhat 默认的测试账户信息
 */

module.exports = {
  // 本地网络配置
  network: {
    url: "http://127.0.0.1:8545",
    chainId: 31337,
    accounts: [
      // 这些是 Hardhat 默认的测试私钥，仅用于本地测试
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
      "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
      "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
      "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
      "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a"
    ]
  },

  // 测试账户信息
  accounts: {
    deployer: {
      address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
      balance: "10000 ETH"
    },
    governor1: {
      address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
      balance: "10000 ETH"
    },
    governor2: {
      address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      privateKey: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
      balance: "10000 ETH"
    },
    user1: {
      address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
      privateKey: "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
      balance: "10000 ETH"
    },
    user2: {
      address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
      privateKey: "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
      balance: "10000 ETH"
    }
  },

  // 合约配置
  contracts: {
    token: {
      name: "USDX Stablecoin",
      symbol: "USDX",
      decimals: 18,
      initialSupply: "1000000000000000000000000000", // 1 billion tokens
      initialOwner: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    },
    governance: {
      governors: [
        "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
      ],
      requiredVotes: 2,
      votingPeriod: 86400, // 24 hours
      executionDelay: 3600 // 1 hour
    }
  }
}; 