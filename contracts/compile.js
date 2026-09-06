const fs = require('fs');
const solc = require('solc');

const source = fs.readFileSync('src/VeriChainRegistry.sol', 'utf8');

const input = {
  language: 'Solidity',
  sources: {
    'VeriChainRegistry.sol': {
      content: source
    }
  },
  settings: {
    outputSelection: {
      '*': {
        '*': ['*']
      }
    }
  }
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
const contract = output.contracts['VeriChainRegistry.sol']['VeriChainRegistry'];

fs.writeFileSync('../frontend/scripts/VeriChainRegistry.bin', contract.evm.bytecode.object);
console.log("Compiled successfully!");
