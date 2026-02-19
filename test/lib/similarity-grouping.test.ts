import { describe, expect, it } from "vitest";
import { groupSimilarPhotos } from "@/lib/similarity-grouping";

describe("groupSimilarPhotos", () => {
  it("returns empty map when fewer than 2 photos", () => {
    expect(groupSimilarPhotos([])).toEqual(new Map());
    expect(
      groupSimilarPhotos([{ id: "a", perceptualHash: "0000000000000000" }]),
    ).toEqual(new Map());
  });

  it("returns empty map when no photos have perceptual hashes", () => {
    const photos = [
      { id: "a", perceptualHash: null },
      { id: "b", perceptualHash: null },
    ];
    expect(groupSimilarPhotos(photos)).toEqual(new Map());
  });

  it("groups identical hashes together", () => {
    const photos = [
      { id: "a", perceptualHash: "abcdef0123456789" },
      { id: "b", perceptualHash: "abcdef0123456789" },
    ];
    const groups = groupSimilarPhotos(photos);
    expect(groups.size).toBe(1);
    const members = [...groups.values()][0];
    expect(members).toContain("a");
    expect(members).toContain("b");
  });

  it("groups photos within threshold", () => {
    // These two hashes differ by exactly 1 bit
    const photos = [
      { id: "a", perceptualHash: "0000000000000000" },
      { id: "b", perceptualHash: "0000000000000001" },
    ];
    const groups = groupSimilarPhotos(photos, 1);
    expect(groups.size).toBe(1);
  });

  it("does not group photos exceeding threshold", () => {
    // All zeros vs all ones = 64 bits difference
    const photos = [
      { id: "a", perceptualHash: "0000000000000000" },
      { id: "b", perceptualHash: "ffffffffffffffff" },
    ];
    const groups = groupSimilarPhotos(photos, 10);
    expect(groups.size).toBe(0);
  });

  it("forms transitive groups via union-find", () => {
    // A is similar to B, B is similar to C, but A is NOT similar to C directly
    // With threshold=1: A-B differ by 1 bit, B-C differ by 1 bit, A-C differ by 2 bits
    const photos = [
      { id: "a", perceptualHash: "0000000000000000" },
      { id: "b", perceptualHash: "0000000000000001" }, // 1 bit from A
      { id: "c", perceptualHash: "0000000000000003" }, // 1 bit from B, 2 bits from A
    ];
    const groups = groupSimilarPhotos(photos, 1);
    // All three should be in one group due to transitivity
    expect(groups.size).toBe(1);
    const members = [...groups.values()][0];
    expect(members).toHaveLength(3);
  });

  it("creates multiple separate groups", () => {
    const photos = [
      { id: "a1", perceptualHash: "0000000000000000" },
      { id: "a2", perceptualHash: "0000000000000000" },
      { id: "b1", perceptualHash: "ffffffffffffffff" },
      { id: "b2", perceptualHash: "ffffffffffffffff" },
    ];
    const groups = groupSimilarPhotos(photos, 10);
    expect(groups.size).toBe(2);
    const allMembers = [...groups.values()].flat();
    expect(allMembers).toHaveLength(4);
  });

  it("skips photos with null perceptualHash", () => {
    const photos = [
      { id: "a", perceptualHash: "0000000000000000" },
      { id: "b", perceptualHash: null },
      { id: "c", perceptualHash: "0000000000000000" },
    ];
    const groups = groupSimilarPhotos(photos);
    expect(groups.size).toBe(1);
    const members = [...groups.values()][0];
    expect(members).toContain("a");
    expect(members).toContain("c");
    expect(members).not.toContain("b");
  });

  it("uses group IDs starting from 0", () => {
    const photos = [
      { id: "a1", perceptualHash: "0000000000000000" },
      { id: "a2", perceptualHash: "0000000000000000" },
      { id: "b1", perceptualHash: "ffffffffffffffff" },
      { id: "b2", perceptualHash: "ffffffffffffffff" },
    ];
    const groups = groupSimilarPhotos(photos, 10);
    const groupIds = [...groups.keys()].sort();
    expect(groupIds).toEqual([0, 1]);
  });

  it("uses default threshold of 10", () => {
    // 0x00ff = 8 bits set, which is within default threshold of 10
    const photos = [
      { id: "a", perceptualHash: "0000000000000000" },
      { id: "b", perceptualHash: "00000000000000ff" },
    ];
    const groups = groupSimilarPhotos(photos);
    expect(groups.size).toBe(1);
  });
});
