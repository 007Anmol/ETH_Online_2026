/**
 * Web NFC (`NDEFReader`) is Chrome-on-Android only, requires HTTPS, and needs
 * a user gesture + permission grant. Feature-detected so the scanner never
 * claims NFC works somewhere it doesn't (per the "don't falsely claim
 * universal NFC support" requirement).
 */
export function isWebNfcSupported(): boolean {
  return typeof window !== "undefined" && "NDEFReader" in window;
}

/**
 * Physical VeriChain tags are provisioned to open a URL carrying
 * `tag_uid`/`nonce`/`cmac` query params (the same contract `/scan` already
 * reads from `searchParams` for a deep-linked tap). When Web NFC reads an
 * NDEF URL record matching that shape, we can extract the same payload
 * directly from a live scan instead of waiting for a page navigation.
 *
 * This has not been exercised against real hardware — it's implemented to
 * the Web NFC spec and the existing tap-payload contract, but unverified
 * beyond that.
 */
export async function readTapPayloadFromNfc(): Promise<
  { tag_uid: string; nonce: string; cmac: string } | null
> {
  if (!isWebNfcSupported()) return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reader = new (window as any).NDEFReader();
    await reader.scan();

    return await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(null), 20000);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      reader.onreading = (event: any) => {
        clearTimeout(timeout);

        for (const record of event.message.records as any[]) {
          if (record.recordType !== "url") continue;

          try {
            const text = new TextDecoder(record.encoding ?? "utf-8").decode(record.data);
            const url = new URL(text);
            const tagUid = url.searchParams.get("tag_uid");
            const nonce = url.searchParams.get("nonce");
            const cmac = url.searchParams.get("cmac");

            if (tagUid && nonce && cmac) {
              resolve({ tag_uid: tagUid, nonce, cmac });
              return;
            }
          } catch {
            // not a parseable VeriChain tap URL — keep checking other records
          }
        }

        resolve(null);
      };
    });
  } catch {
    return null;
  }
}
