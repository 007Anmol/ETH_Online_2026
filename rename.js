const fs = require('fs');
const glob = require('glob');
const path = require('path');

const files = [
  'frontend/lib/nfc/revoke-tag.ts',
  'frontend/lib/nfc/verify-tap.ts',
  'frontend/lib/nfc/bind-tag.ts',
  'frontend/scripts/create-batch-onchain.ts',
  'frontend/scripts/test-batches.ts',
  'frontend/scripts/test-schema.ts',
  'frontend/scripts/test-shared.ts',
  'frontend/scripts/seed.ts'
];

files.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    content = content.replace(/placeholderHash/g, 'deriveOnChainId');
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Replaced in ${file}`);
  } else {
    console.log(`File not found: ${file}`);
  }
});
