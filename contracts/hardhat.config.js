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

// Gas Reporter 配置优化
const gasReporterConfig = {
  enabled: process.env.REPORT_GAS === "true",
  currency: "USD",
  gasPrice: 20, // gwei
  coinmarketcap: process.env.COINMARKETCAP_API_KEY,

  // 优化输出格式，减少冗余信息
  outputFile: process.env.GAS_REPORT_FILE || undefined,
  noColors: process.env.NO_COLOR === "1" || process.env.CI === "true",
  rst: false,
  rstTitle: "Gas Usage Report",

  // 只包含重要的合约和方法
  excludeContracts: [
    "Mock",
    "Test",
    "Debug",
    "Example"
  ],

  // 在CI环境中简化输出
  ...(process.env.CI === "true" && {
    showTimeSpent: false,
    showMethodSig: false,
    maxMethodDiff: 0,
    maxDeploymentDiff: 0
  })
};

// 优化网络配置，减少日志输出
const networks = {
  hardhat: {
    chainId: 31337,
    gas: 12000000,
    gasPrice: 20000000000,
    gasMultiplier: 1,
    blockGasLimit: 12000000,

    // 减少日志输出
    ...(process.env.CI === "true" && {
      loggingEnabled: false,
      accounts: {
        count: 10, // 减少账户数量
        accountsBalance: "10000000000000000000000"
      }
    }),

    // 在本地保持详细日志
    ...(!process.env.CI && {
      loggingEnabled: true,
      accounts: {
        count: 20,
        accountsBalance: "10000000000000000000000"
      }
    })
  },

  localhost: {
    url: "http://127.0.0.1:8545",
    chainId: 31337,
    gas: 12000000,
    gasPrice: 20000000000,
    timeout: 60000
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
};

module.exports = {
  solidity: {
    compilers: [
      getCompilerSettings("0.8.19", 200),
      getCompilerSettings("0.8.20", 200),
      getCompilerSettings("0.8.22", 200), // 主要版本
      getCompilerSettings("0.8.24", 200),
    ],
    settings: {
      optimizer: {
        enabled: true,
        runs: process.env.OPTIMIZER_RUNS ? parseInt(process.env.OPTIMIZER_RUNS) : 1000,
        details: {
          yul: true,
          yulDetails: {
            stackAllocation: true,
            optimizerSteps: "dhfoDgvulfnTUtnIf"
          }
        }
      },

      // 在CI环境中减少编译输出
      ...(process.env.CI === "true" && {
        outputSelection: {
          "*": {
            "*": ["abi", "evm.bytecode", "evm.methodIdentifiers"]
          }
        }
      })
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

  networks: networks,

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
  gasReporter: gasReporterConfig,

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
    timeout: process.env.CI === "true" ? 120000 : 60000, // CI环境中增加超时时间
    slow: 10000,
    bail: process.env.CI === "true", // CI中遇到第一个错误就停止
    allowUncaught: false,
    parallel: process.env.PARALLEL_TESTS === "true",
    jobs: process.env.PARALLEL_JOBS ? parseInt(process.env.PARALLEL_JOBS) : 4,
    reporter: process.env.CI === "true" ? "dot" : "spec", // CI中使用简化报告器
    reporterOptions: process.env.MOCHA_REPORTER_OPTIONS
      ? JSON.parse(process.env.MOCHA_REPORTER_OPTIONS)
      : {},
    grep: process.env.TEST_GREP || undefined
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
