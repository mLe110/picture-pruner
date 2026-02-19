import { describe, expect, it } from "vitest";
import { getPhotoUrl, formatFileSize } from "@/lib/photo-utils";

const PROJECT_ID = "550e8400-e29b-41d4-a716-446655440000";

describe("getPhotoUrl", () => {
  it("returns a project-scoped API URL for the given filename", () => {
    expect(getPhotoUrl(PROJECT_ID, "sunset.jpg")).toBe(
      `/api/projects/${PROJECT_ID}/images/sunset.jpg`,
    );
  });

  it("encodes special characters in the filename", () => {
    expect(getPhotoUrl(PROJECT_ID, "my photo (1).jpg")).toBe(
      `/api/projects/${PROJECT_ID}/images/my%20photo%20(1).jpg`,
    );
  });

  it("encodes unicode characters", () => {
    expect(getPhotoUrl(PROJECT_ID, "café.png")).toBe(
      `/api/projects/${PROJECT_ID}/images/caf%C3%A9.png`,
    );
  });
});

describe("formatFileSize", () => {
  it("formats bytes", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(1023)).toBe("1023 B");
  });

  it("formats kilobytes", () => {
    expect(formatFileSize(1024)).toBe("1.0 KB");
    expect(formatFileSize(1536)).toBe("1.5 KB");
    expect(formatFileSize(1024 * 512)).toBe("512.0 KB");
  });

  it("formats megabytes", () => {
    expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe("2.5 MB");
  });

  it("formats gigabytes", () => {
    expect(formatFileSize(1024 * 1024 * 1024)).toBe("1.0 GB");
    expect(formatFileSize(1.5 * 1024 * 1024 * 1024)).toBe("1.5 GB");
  });
});
