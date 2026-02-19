import { describe, expect, it } from "vitest";
import {
  PhotoStatusSchema,
  PhotoSchema,
  PhotoFilterSchema,
  DuplicateGroupSchema,
  DuplicateGroupsResponseSchema,
  SimilarGroupSchema,
  SimilarGroupsResponseSchema,
  ViewModeSchema,
} from "@/schemas";

describe("PhotoStatusSchema", () => {
  it("accepts valid statuses", () => {
    expect(PhotoStatusSchema.parse("unreviewed")).toBe("unreviewed");
    expect(PhotoStatusSchema.parse("keep")).toBe("keep");
    expect(PhotoStatusSchema.parse("discard")).toBe("discard");
    expect(PhotoStatusSchema.parse("maybe")).toBe("maybe");
  });

  it("rejects invalid statuses", () => {
    expect(() => PhotoStatusSchema.parse("deleted")).toThrow();
    expect(() => PhotoStatusSchema.parse("")).toThrow();
    expect(() => PhotoStatusSchema.parse(42)).toThrow();
  });
});

describe("PhotoFilterSchema", () => {
  it("accepts valid filters", () => {
    expect(PhotoFilterSchema.parse("all")).toBe("all");
    expect(PhotoFilterSchema.parse("unreviewed")).toBe("unreviewed");
    expect(PhotoFilterSchema.parse("keep")).toBe("keep");
    expect(PhotoFilterSchema.parse("discard")).toBe("discard");
    expect(PhotoFilterSchema.parse("maybe")).toBe("maybe");
  });

  it("rejects invalid filters", () => {
    expect(() => PhotoFilterSchema.parse("favorites")).toThrow();
    expect(() => PhotoFilterSchema.parse("")).toThrow();
  });
});

describe("PhotoSchema", () => {
  const validPhoto = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    projectId: "660e8400-e29b-41d4-a716-446655440000",
    fileName: "sunset.jpg",
    filePath: "/data/input/sunset.jpg",
    width: 1920,
    height: 1080,
    fileSizeBytes: 2_500_000,
    mimeType: "image/jpeg",
    status: "unreviewed",
    fileExists: true,
    importedAt: "2025-01-15T10:30:00Z",
  };

  it("accepts a valid photo", () => {
    const result = PhotoSchema.parse(validPhoto);
    expect(result).toEqual(validPhoto);
  });

  it("accepts a photo with optional fields", () => {
    const photo = {
      ...validPhoto,
      hash: "abc123def456",
      perceptualHash: "a1b2c3d4e5f6a7b8",
      takenAt: "2024-12-25T08:00:00Z",
    };
    const result = PhotoSchema.parse(photo);
    expect(result.hash).toBe("abc123def456");
    expect(result.perceptualHash).toBe("a1b2c3d4e5f6a7b8");
    expect(result.takenAt).toBe("2024-12-25T08:00:00Z");
  });

  it("accepts a photo without optional fields", () => {
    const result = PhotoSchema.parse(validPhoto);
    expect(result.hash).toBeUndefined();
    expect(result.perceptualHash).toBeUndefined();
    expect(result.takenAt).toBeUndefined();
  });

  it("rejects a photo with invalid uuid", () => {
    expect(() =>
      PhotoSchema.parse({ ...validPhoto, id: "not-a-uuid" }),
    ).toThrow();
  });

  it("rejects a photo with empty fileName", () => {
    expect(() => PhotoSchema.parse({ ...validPhoto, fileName: "" })).toThrow();
  });

  it("rejects a photo with non-positive dimensions", () => {
    expect(() => PhotoSchema.parse({ ...validPhoto, width: 0 })).toThrow();
    expect(() => PhotoSchema.parse({ ...validPhoto, height: -1 })).toThrow();
  });

  it("rejects a photo with negative file size", () => {
    expect(() =>
      PhotoSchema.parse({ ...validPhoto, fileSizeBytes: -100 }),
    ).toThrow();
  });

  it("accepts a photo with zero file size", () => {
    const result = PhotoSchema.parse({ ...validPhoto, fileSizeBytes: 0 });
    expect(result.fileSizeBytes).toBe(0);
  });

  it("rejects a photo with invalid status", () => {
    expect(() =>
      PhotoSchema.parse({ ...validPhoto, status: "archived" }),
    ).toThrow();
  });

  it("rejects a photo with invalid importedAt datetime", () => {
    expect(() =>
      PhotoSchema.parse({ ...validPhoto, importedAt: "not-a-date" }),
    ).toThrow();
  });

  it("rejects a photo missing required fields", () => {
    const missingFileName = { ...validPhoto };
    delete (missingFileName as Record<string, unknown>).fileName;
    expect(() => PhotoSchema.parse(missingFileName)).toThrow();
  });
});

const validPhoto = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  projectId: "660e8400-e29b-41d4-a716-446655440000",
  fileName: "sunset.jpg",
  filePath: "/data/input/sunset.jpg",
  width: 1920,
  height: 1080,
  fileSizeBytes: 2_500_000,
  mimeType: "image/jpeg",
  status: "unreviewed" as const,
  fileExists: true,
  importedAt: "2025-01-15T10:30:00Z",
};

const validPhoto2 = {
  ...validPhoto,
  id: "550e8400-e29b-41d4-a716-446655440001",
  fileName: "sunset_copy.jpg",
  filePath: "/data/input/sunset_copy.jpg",
};

describe("DuplicateGroupSchema", () => {
  it("accepts a valid group with 2+ photos", () => {
    const group = {
      hash: "abc123",
      photos: [validPhoto, validPhoto2],
    };
    expect(() => DuplicateGroupSchema.parse(group)).not.toThrow();
  });

  it("rejects a group with fewer than 2 photos", () => {
    expect(() =>
      DuplicateGroupSchema.parse({ hash: "abc", photos: [validPhoto] }),
    ).toThrow();
  });

  it("rejects a group with empty hash", () => {
    expect(() =>
      DuplicateGroupSchema.parse({
        hash: "",
        photos: [validPhoto, validPhoto2],
      }),
    ).toThrow();
  });

  it("rejects a group with no photos", () => {
    expect(() =>
      DuplicateGroupSchema.parse({ hash: "abc", photos: [] }),
    ).toThrow();
  });
});

describe("DuplicateGroupsResponseSchema", () => {
  it("accepts a valid response", () => {
    const response = {
      groups: [{ hash: "abc", photos: [validPhoto, validPhoto2] }],
      totalDuplicatePhotos: 2,
    };
    expect(() => DuplicateGroupsResponseSchema.parse(response)).not.toThrow();
  });

  it("accepts empty groups", () => {
    const response = { groups: [], totalDuplicatePhotos: 0 };
    expect(() => DuplicateGroupsResponseSchema.parse(response)).not.toThrow();
  });

  it("rejects negative totalDuplicatePhotos", () => {
    expect(() =>
      DuplicateGroupsResponseSchema.parse({
        groups: [],
        totalDuplicatePhotos: -1,
      }),
    ).toThrow();
  });
});

describe("SimilarGroupSchema", () => {
  it("accepts a valid group with 2+ photos", () => {
    const group = {
      groupId: 0,
      photos: [validPhoto, validPhoto2],
    };
    expect(() => SimilarGroupSchema.parse(group)).not.toThrow();
  });

  it("rejects a group with fewer than 2 photos", () => {
    expect(() =>
      SimilarGroupSchema.parse({ groupId: 0, photos: [validPhoto] }),
    ).toThrow();
  });

  it("rejects a negative groupId", () => {
    expect(() =>
      SimilarGroupSchema.parse({
        groupId: -1,
        photos: [validPhoto, validPhoto2],
      }),
    ).toThrow();
  });

  it("rejects a non-integer groupId", () => {
    expect(() =>
      SimilarGroupSchema.parse({
        groupId: 1.5,
        photos: [validPhoto, validPhoto2],
      }),
    ).toThrow();
  });
});

describe("SimilarGroupsResponseSchema", () => {
  it("accepts a valid response", () => {
    const response = {
      groups: [{ groupId: 0, photos: [validPhoto, validPhoto2] }],
      totalSimilarPhotos: 2,
    };
    expect(() => SimilarGroupsResponseSchema.parse(response)).not.toThrow();
  });

  it("accepts empty groups", () => {
    const response = { groups: [], totalSimilarPhotos: 0 };
    expect(() => SimilarGroupsResponseSchema.parse(response)).not.toThrow();
  });

  it("rejects negative totalSimilarPhotos", () => {
    expect(() =>
      SimilarGroupsResponseSchema.parse({ groups: [], totalSimilarPhotos: -1 }),
    ).toThrow();
  });
});

describe("ViewModeSchema", () => {
  it("accepts browse, duplicates, and similar", () => {
    expect(ViewModeSchema.parse("browse")).toBe("browse");
    expect(ViewModeSchema.parse("duplicates")).toBe("duplicates");
    expect(ViewModeSchema.parse("similar")).toBe("similar");
  });

  it("rejects invalid view modes", () => {
    expect(() => ViewModeSchema.parse("grid")).toThrow();
    expect(() => ViewModeSchema.parse("")).toThrow();
  });
});
