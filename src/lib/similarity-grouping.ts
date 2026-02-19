import { hammingDistance } from "@/lib/perceptual-hash";

const DEFAULT_THRESHOLD = 10;

/**
 * Union-Find (Disjoint Set Union) data structure for efficient grouping.
 */
class UnionFind {
  private parent: number[];
  private rank: number[];

  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, i) => i);
    this.rank = new Array(size).fill(0);
  }

  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]);
    }
    return this.parent[x];
  }

  union(x: number, y: number): void {
    const rootX = this.find(x);
    const rootY = this.find(y);
    if (rootX === rootY) return;

    if (this.rank[rootX] < this.rank[rootY]) {
      this.parent[rootX] = rootY;
    } else if (this.rank[rootX] > this.rank[rootY]) {
      this.parent[rootY] = rootX;
    } else {
      this.parent[rootY] = rootX;
      this.rank[rootX]++;
    }
  }
}

/**
 * Group photos by visual similarity using perceptual hash Hamming distance.
 *
 * @param photos - Array of photos with id and perceptualHash
 * @param threshold - Maximum Hamming distance to consider two photos similar (default: 10)
 * @returns Map of groupId → array of photo IDs (only groups with 2+ members)
 */
export function groupSimilarPhotos(
  photos: Array<{ id: string; perceptualHash: string | null }>,
  threshold: number = DEFAULT_THRESHOLD,
): Map<number, string[]> {
  // Filter to photos with valid perceptual hashes
  const hashablePhotos = photos.filter(
    (p): p is { id: string; perceptualHash: string } =>
      p.perceptualHash !== null,
  );

  if (hashablePhotos.length < 2) {
    return new Map();
  }

  const uf = new UnionFind(hashablePhotos.length);

  // O(n²) pairwise comparison
  for (let i = 0; i < hashablePhotos.length; i++) {
    for (let j = i + 1; j < hashablePhotos.length; j++) {
      const dist = hammingDistance(
        hashablePhotos[i].perceptualHash,
        hashablePhotos[j].perceptualHash,
      );
      if (dist <= threshold) {
        uf.union(i, j);
      }
    }
  }

  // Collect groups by root
  const groupsByRoot = new Map<number, string[]>();
  for (let i = 0; i < hashablePhotos.length; i++) {
    const root = uf.find(i);
    const existing = groupsByRoot.get(root);
    if (existing) {
      existing.push(hashablePhotos[i].id);
    } else {
      groupsByRoot.set(root, [hashablePhotos[i].id]);
    }
  }

  // Re-index groups (0, 1, 2, ...) and filter to 2+ members
  const result = new Map<number, string[]>();
  let groupId = 0;
  for (const members of groupsByRoot.values()) {
    if (members.length >= 2) {
      result.set(groupId, members);
      groupId++;
    }
  }

  return result;
}
