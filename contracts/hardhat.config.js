require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("hardhat-contract-sizer");
require("hardhat-gas-reporter");
require("hardhat-docgen");
require("dotenv").config();

const {
  PRIVATE_KEY,
  ETHERSCAN_API_KEY,
  POLYGONSCAN_API_KEY,
  BSCSCAN_API_KEY,
  ARBITRUMSCAN_API_KEY,
  OPTIMISMSCAN_API_KEY,
  COINMARKETCAP_API_KEY,
  INFURA_API_KEY,
  ALCHEMY_API_KEY,
} = process.env;

// 获取优化器设置
const getOptimizerSettings = (runs = 200) => ({
  enabled: true,
  runs: process.env.OPTIMIZER_RUNS ? parseInt(process.env.OPTIMIZER_RUNS) : runs,
  details: {
    yul: true,
    yulDetails: {
      stackAllocation: true,
      optimizerSteps: "dhfoDgvulfnTUtnIf",
    },
  },
});

// 获取编译器设置
const getCompilerSettings = (version, runs = 200) => ({
  version,
  settings: {
    optimizer: getOptimizerSettings(runs),
    viaIR: process.env.VIA_IR === "true",
    metadata: {
      bytecodeHash: "none",
      useLiteralContent: true,
    },
    outputSelection: {
      "*": {
        "*": ["evm.bytecode", "evm.deployedBytecode", "devdoc", "userdoc", "metadata", "abi"],
      },
    },
  },
});

module.exports = {
  solidity: {
    compilers: [
      getCompilerSettings("0.8.19", 200),
      getCompilerSettings("0.8.20", 200),
      getCompilerSettings("0.8.22", 200), // 主要版本
      getCompilerSettings("0.8.24", 200),
    ],
    settings: {
      optimizer: getOptimizerSettings(200),
    },
  },

  paths: {
    sources: "./src",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
    root: "./",
    sources: "./src",
    tests: "./test",
  },

  networks: {
    // 开发网络
    hardhat: {
      chainId: 31337,
      allowUnlimitedContractSize: false,
      gas: 12000000,
      blockGasLimit: 12000000,
      gasPrice: 20000000000,
      // 启用调试功能
      loggingEnabled: true,
      accounts: {
        count: 20,
        accountsBalance: "10000000000000000000000", // 10000 ETH
      },
      forking: process.env.FORK_URL
        ? {
            url: process.env.FORK_URL,
            blockNumber: process.env.FORK_BLOCK_NUMBER
              ? parseInt(process.env.FORK_BLOCK_NUMBER)
              : undefined,
          }
        : undefined,
      mining: {
        auto: true,
        interval: process.env.MINING_INTERVAL ? parseInt(process.env.MINING_INTERVAL) : 0,
      },
    },

    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
      timeout: 60000,
      accounts: PRIVATE_KEY
        ? [PRIVATE_KEY]
        : [
            "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
            "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
          ],
    },

    // Ethereum networks
    goerli: {
      url: `https://goerli.infura.io/v3/${INFURA_API_KEY}`,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 5,
      gasPrice: "auto",
      gasMultiplier: 1.2,
      timeout: 60000,
      confirmations: 2,
    },

    sepolia: {
      url: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 11155111,
      gasPrice: "auto",
      gasMultiplier: 1.2,
      timeout: 60000,
      confirmations: 2,
    },

    mainnet: {
      url: `https://mainnet.infura.io/v3/${INFURA_API_KEY}`,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 1,
      gasPrice: "auto",
      gasMultiplier: 1.1,
      timeout: 120000,
      confirmations: 3,
    },

    // Layer 2 networks
    polygon: {
      url: `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 137,
      gasPrice: "auto",
      gasMultiplier: 1.2,
      timeout: 60000,
    },

    arbitrum: {
      url: "https://arb1.arbitrum.io/rpc",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 42161,
      gasPrice: "auto",
      timeout: 60000,
    },

    optimism: {
      url: "https://mainnet.optimism.io",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 10,
      gasPrice: "auto",
      timeout: 60000,
    },
  },

  etherscan: {
    apiKey: {
      mainnet: ETHERSCAN_API_KEY,
      goerli: ETHERSCAN_API_KEY,
      sepolia: ETHERSCAN_API_KEY,
      polygon: POLYGONSCAN_API_KEY,
      polygonMumbai: POLYGONSCAN_API_KEY,
      bsc: BSCSCAN_API_KEY,
      bscTestnet: BSCSCAN_API_KEY,
      arbitrumOne: ARBITRUMSCAN_API_KEY,
      arbitrumGoerli: ARBITRUMSCAN_API_KEY,
      optimisticEthereum: OPTIMISMSCAN_API_KEY,
      optimisticGoerli: OPTIMISMSCAN_API_KEY,
    },
    customChains: [],
  },

  // Gas报告配置
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
    coinmarketcap: COINMARKETCAP_API_KEY,
    gasPriceApi: "https://api.etherscan.io/api?module=proxy&action=eth_gasPrice",
    showTimeSpent: true,
    showMethodSig: true,
    maxMethodDiff: 10,
    excludeContracts: ["Mock", "Test"],
    src: "./src",
    outputFile: process.env.GAS_REPORT_FILE || undefined,
    noColors: false,
    reportFormat: process.env.GAS_REPORT_FORMAT || "terminal",
    forceTerminalOutput: false,
    L1: "ethereum",
    L2: "polygon",
    L2Etherscan: POLYGONSCAN_API_KEY,
    coinmarketcap: COINMARKETCAP_API_KEY,
    rst: false,
    rstTitle: "Gas Usage",
    onlyCalledMethods: true,
  },

  // 合约大小配置
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: process.env.SIZE_CONTRACTS === "true",
    strict: false,
    only: process.env.SIZE_ONLY ? process.env.SIZE_ONLY.split(",") : undefined,
    except: process.env.SIZE_EXCEPT ? process.env.SIZE_EXCEPT.split(",") : ["Mock", "Test"],
  },

  // 文档生成配置
  docgen: {
    path: "./docs",
    clear: true,
    runOnCompile: false,
    except: ["Mock", "Test", "console.sol"],
    pages: "files",
    templates: "templates",
  },

  // Mocha测试配置
  mocha: {
    timeout: process.env.MOCHA_TIMEOUT ? parseInt(process.env.MOCHA_TIMEOUT) : 200000,
    slow: 10000,
    bail: process.env.BAIL_ON_FAIL === "true",
    allowUncaught: false,
    parallel: process.env.PARALLEL_TESTS === "true",
    jobs: process.env.PARALLEL_JOBS ? parseInt(process.env.PARALLEL_JOBS) : 4,
    reporter: process.env.MOCHA_REPORTER || "spec",
    reporterOptions: process.env.MOCHA_REPORTER_OPTIONS
      ? JSON.parse(process.env.MOCHA_REPORTER_OPTIONS)
      : {},
  },

  // TypeChain配置
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
    alwaysGenerateOverloads: false,
    externalArtifacts: ["node_modules/@openzeppelin/contracts/build/contracts/*.json"],
    dontOverrideCompile: false,
  },

  // 合约验证设置
  sourcify: {
    enabled: true,
    apiUrl: "https://sourcify.dev/server",
    browserUrl: "https://sourcify.dev",
  },

  // 验证配置
  verify: {
    etherscan: {
      apiKey: ETHERSCAN_API_KEY,
    },
  },

  // 警告设置
  warnings: {
    "contracts/**/*": {
      "code-size": "error",
      "unused-param": "off",
      "unused-var": "error",
    },
  },

  // 默认网络
  defaultNetwork: "hardhat",

  // 调试模式和配置
  debug: process.env.DEBUG === "true",

  // 调试器配置
  debugger: {
    enabled: true,
    port: 8080,
  },

  // 外部合约配置
  external: process.env.EXTERNAL_DEPLOYMENTS
    ? {
        contracts: JSON.parse(process.env.EXTERNAL_DEPLOYMENTS),
      }
    : undefined,
};
