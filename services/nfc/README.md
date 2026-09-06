# services/nfc

NFC bind / verify / CMAC live in `frontend/lib/nfc`.

Do not add a second implementation here. Phase 2 Hedera calls go in `@verichain/hedera` (`services/hedera`), invoked from those frontend lib files.
