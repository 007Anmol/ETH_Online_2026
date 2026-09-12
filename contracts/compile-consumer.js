const fs = require('fs');
const path = require('path');
const solc = require('solc');

function readSource(relPath) {
  return fs.readFileSync(path.join(__dirname, relPath), 'utf8');
}

const input = {
  language: 'Solidity',
  sources: {
    'VeriChainConsumerNFT.sol': { content: readSource('src/VeriChainConsumerNFT.sol') },
    'VeriChainMarketplace.sol': { content: readSource('src/VeriChainMarketplace.sol') },
  },
  settings: {
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));

let hasError = false;
for (const diagnostic of output.errors ?? []) {
  console.log(diagnostic.formattedMessage ?? diagnostic.message);
  if (diagnostic.severity === 'error') hasError = true;
}

if (hasError) {
  console.error('\nCompilation FAILED.');
  process.exit(1);
}

const nft = output.contracts['VeriChainConsumerNFT.sol']['VeriChainConsumerNFT'];
const market = output.contracts['VeriChainMarketplace.sol']['VeriChainMarketplace'];

console.log('Compiled successfully.');
console.log('VeriChainConsumerNFT bytecode length:', nft.evm.bytecode.object.length);
console.log('VeriChainMarketplace bytecode length:', market.evm.bytecode.object.length);
console.log('VeriChainConsumerNFT ABI functions:', nft.abi.filter((f) => f.type === 'function').map((f) => f.name));
console.log('VeriChainMarketplace ABI functions:', market.abi.filter((f) => f.type === 'function').map((f) => f.name));
