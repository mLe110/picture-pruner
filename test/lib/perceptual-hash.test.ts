import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { writeFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { computePerceptualHash, hammingDistance } from "@/lib/perceptual-hash";

const FIXTURES_DIR = path.join(import.meta.dirname, "fixtures-phash");

beforeAll(async () => {
  await mkdir(FIXTURES_DIR, { recursive: true });
});

afterAll(async () => {
  await rm(FIXTURES_DIR, { recursive: true, force: true });
});

async function createTestImage(
  fileName: string,
  width: number,
  height: number,
  color: { r: number; g: number; b: number },
): Promise<string> {
  const filePath = path.join(FIXTURES_DIR, fileName);
  await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: color,
    },
  })
    .jpeg()
    .toFile(filePath);
  return filePath;
}

describe("computePerceptualHash", () => {
  it("returns a 16-character hex string", async () => {
    const filePath = await createTestImage("solid.jpg", 100, 100, {
      r: 128,
      g: 128,
      b: 128,
    });
    const hash = await computePerceptualHash(filePath);
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it("is deterministic — same image produces same hash", async () => {
    const filePath = await createTestImage("determ.jpg", 200, 150, {
      r: 50,
      g: 100,
      b: 150,
    });
    const hash1 = await computePerceptualHash(filePath);
    const hash2 = await computePerceptualHash(filePath);
    expect(hash1).toBe(hash2);
  });

  it("produces identical hashes for the same image at different resolutions", async () => {
    const small = await createTestImage("small.jpg", 100, 100, {
      r: 200,
      g: 50,
      b: 50,
    });
    const large = await createTestImage("large.jpg", 1000, 1000, {
      r: 200,
      g: 50,
      b: 50,
    });
    const hashSmall = await computePerceptualHash(small);
    const hashLarge = await computePerceptualHash(large);
    expect(hashSmall).toBe(hashLarge);
  });

  it("produces different hashes for visually different images", async () => {
    // Create a checkerboard-like pattern: alternating black and white columns
    const width = 100;
    const height = 100;
    const checkerBuf = Buffer.alloc(width * height * 3);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 3;
        // Alternating black/white in wide stripes (survive JPEG compression)
        const val = x < width / 2 ? 0 : 255;
        checkerBuf[idx] = val;
        checkerBuf[idx + 1] = val;
        checkerBuf[idx + 2] = val;
      }
    }
    const checkerPath = path.join(FIXTURES_DIR, "checker.png");
    await sharp(checkerBuf, { raw: { width, height, channels: 3 } })
      .png()
      .toFile(checkerPath);

    const solidPath = await createTestImage("solid_diff.jpg", 100, 100, {
      r: 128,
      g: 128,
      b: 128,
    });

    const hashChecker = await computePerceptualHash(checkerPath);
    const hashSolid = await computePerceptualHash(solidPath);

    expect(hashChecker).not.toBe(hashSolid);
  });
});

describe("hammingDistance", () => {
  it("returns 0 for identical hashes", () => {
    expect(hammingDistance("abcdef0123456789", "abcdef0123456789")).toBe(0);
  });

  it("returns correct distance for hashes differing by 1 bit", () => {
    // 0x0000000000000000 vs 0x0000000000000001 differ by 1 bit
    expect(hammingDistance("0000000000000000", "0000000000000001")).toBe(1);
  });

  it("returns 64 for maximally different hashes", () => {
    // All zeros vs all ones
    expect(hammingDistance("0000000000000000", "ffffffffffffffff")).toBe(64);
  });

  it("is symmetric", () => {
    const a = "a1b2c3d4e5f6a7b8";
    const b = "1234567890abcdef";
    expect(hammingDistance(a, b)).toBe(hammingDistance(b, a));
  });

  it("handles known bit patterns", () => {
    // 0xff = 8 bits set, rest zero
    expect(hammingDistance("0000000000000000", "00000000000000ff")).toBe(8);
  });
});
