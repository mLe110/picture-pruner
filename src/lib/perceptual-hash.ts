import sharp from "sharp";

/**
 * Compute a dHash (difference hash) perceptual fingerprint for an image.
 *
 * Algorithm:
 * 1. Resize image to 9x8 grayscale (raw pixel buffer)
 * 2. For each of the 8 rows, compare 8 adjacent pixel pairs (left > right = 1, else 0)
 * 3. Produces a 64-bit fingerprint stored as a 16-char hex string
 *
 * Similar images differ by few bits — Hamming distance ≤ 10 means visually similar.
 */
export async function computePerceptualHash(filePath: string): Promise<string> {
  const { data } = await sharp(filePath)
    .grayscale()
    .resize(9, 8, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  // data is 9*8 = 72 bytes, one byte per pixel, row-major
  let bits = 0n;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const left = data[row * 9 + col];
      const right = data[row * 9 + col + 1];
      if (left > right) {
        bits |= 1n << BigInt(row * 8 + col);
      }
    }
  }

  return bits.toString(16).padStart(16, "0");
}

/**
 * Compute the Hamming distance between two 64-bit perceptual hashes.
 * Returns the number of differing bits (0 = identical, 64 = maximally different).
 */
export function hammingDistance(a: string, b: string): number {
  const xor = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
  return popcount64(xor);
}

/**
 * Count the number of set bits in a BigInt (population count).
 */
function popcount64(n: bigint): number {
  let count = 0;
  let val = n;
  while (val > 0n) {
    val &= val - 1n;
    count++;
  }
  return count;
}
