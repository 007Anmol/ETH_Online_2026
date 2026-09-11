# Hashio does not accept Foundry 1.8 EIP-1898 block objects used by `forge script`.
# Deploy with `forge create` + explicit legacy gas/nonce instead.
param(
  [string]$Rpc = "https://testnet.hashio.io/api",
  [string]$PrivateKey = $(if ($pk) { $pk } else { $env:HEDERA_PRIVATE_KEY })
)

$ErrorActionPreference = "Stop"
if (-not $PrivateKey) {
  throw "Set `$pk in this shell, or pass -PrivateKey / `$env:HEDERA_PRIVATE_KEY"
}

$addr = (cast wallet address --private-key $PrivateKey).Trim()
$nonce = [int](cast nonce $addr --rpc-url $Rpc)
$gasPrice = (cast gas-price --rpc-url $Rpc).Trim()
Write-Host "Deployer $addr nonce=$nonce gasPrice=$gasPrice"

function Deploy-Contract([string]$Path, [string[]]$CtorArgs, [int]$UseNonce) {
  $args = @(
    $Path,
    "--rpc-url", $Rpc,
    "--private-key", $PrivateKey,
    "--broadcast",
    "--legacy",
    "--gas-price", $gasPrice,
    "--nonce", "$UseNonce",
    "--gas-limit", "3000000"
  )
  if ($CtorArgs.Count -gt 0) {
    $args += "--constructor-args"
    $args += $CtorArgs
  }

  $output = & forge create @args 2>&1 | Out-String
  Write-Host $output
  $match = [regex]::Match($output, "Deployed to:\s+(0x[0-9a-fA-F]{40})")
  if (-not $match.Success) {
    throw "Deploy failed for $Path. If you still see [object Object], use cast send --create as in the README comment."
  }
  return $match.Groups[1].Value
}

$registry = Deploy-Contract "src/VeriChainRegistry.sol:VeriChainRegistry" @() $nonce
$supply = Deploy-Contract "src/VeriChainSupplyChain.sol:VeriChainSupplyChain" @($registry) ($nonce + 1)
$escrow = Deploy-Contract "src/VeriChainEscrow.sol:VeriChainEscrow" @($supply) ($nonce + 2)

Write-Host "TEAM1_REGISTRY_ADDRESS=$registry"
Write-Host "SUPPLY_CHAIN_ADDRESS=$supply"
Write-Host "ESCROW_ADDRESS=$escrow"
Write-Host "Paste those three into frontend/.env.local (NEXT_PUBLIC_* and server copies)."
