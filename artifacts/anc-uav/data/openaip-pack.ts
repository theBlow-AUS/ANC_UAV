import { gunzipSync, strFromU8 } from 'fflate';
import { parseNavigationPack } from './navigation-pack';
import { OPENAIP_AU_PACK_GZIP_BASE64 } from './openaip-au-pack-gzip';

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const BASE64_LOOKUP = (() => {
  const lookup = new Int16Array(128).fill(-1);
  for (let i = 0; i < BASE64.length; i++) lookup[BASE64.charCodeAt(i)] = i;
  return lookup;
})();

function decodeBase64(value: string) {
  const bytes = new Uint8Array(Math.floor(value.length * 3 / 4));
  let accumulator = 0;
  let bits = 0;
  let output = 0;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code === 61) break;
    const digit = code < BASE64_LOOKUP.length ? BASE64_LOOKUP[code] : -1;
    if (digit < 0) continue;
    accumulator = (accumulator << 6) | digit;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[output++] = (accumulator >> bits) & 0xff;
      accumulator &= (1 << bits) - 1;
    }
  }
  return bytes.subarray(0, output);
}

const unpacked = JSON.parse(strFromU8(gunzipSync(decodeBase64(OPENAIP_AU_PACK_GZIP_BASE64))));

// The compressed, licensed reference is unpacked and validated locally.
// Nothing is downloaded or stored through an app or Replit service at runtime.
export const OPENAIP_AU_PACK = parseNavigationPack(unpacked);
