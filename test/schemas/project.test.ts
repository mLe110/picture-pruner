import { describe, expect, it } from "vitest";
import {
  ProjectSchema,
  CreateProjectSchema,
  UpdateProjectSchema,
} from "@/schemas";

describe("ProjectSchema", () => {
  const validProject = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    name: "Philippines Trip",
    inputDir: "/Users/me/Photos/Philippines",
    createdAt: "2025-01-15T10:30:00Z",
    updatedAt: "2025-01-15T10:30:00Z",
  };

  it("accepts a valid project", () => {
    const result = ProjectSchema.parse(validProject);
    expect(result).toEqual(validProject);
  });

  it("rejects a project with invalid uuid", () => {
    expect(() =>
      ProjectSchema.parse({ ...validProject, id: "not-a-uuid" }),
    ).toThrow();
  });

  it("rejects a project with empty name", () => {
    expect(() => ProjectSchema.parse({ ...validProject, name: "" })).toThrow();
  });

  it("rejects a project with empty inputDir", () => {
    expect(() =>
      ProjectSchema.parse({ ...validProject, inputDir: "" }),
    ).toThrow();
  });

  it("rejects a project with invalid datetime", () => {
    expect(() =>
      ProjectSchema.parse({ ...validProject, createdAt: "not-a-date" }),
    ).toThrow();
  });

  it("rejects a project missing required fields", () => {
    const missingName = { ...validProject };
    delete (missingName as Record<string, unknown>).name;
    expect(() => ProjectSchema.parse(missingName)).toThrow();
  });

  it("accepts a project with outputDir", () => {
    const result = ProjectSchema.parse({
      ...validProject,
      outputDir: "/output/dir",
    });
    expect(result.outputDir).toBe("/output/dir");
  });

  it("accepts a project without outputDir", () => {
    const result = ProjectSchema.parse(validProject);
    expect(result.outputDir).toBeUndefined();
  });
});

describe("CreateProjectSchema", () => {
  it("accepts valid create data", () => {
    const result = CreateProjectSchema.parse({
      name: "Philippines Trip",
      inputDir: "/Users/me/Photos/Philippines",
    });
    expect(result.name).toBe("Philippines Trip");
    expect(result.inputDir).toBe("/Users/me/Photos/Philippines");
  });

  it("rejects empty name", () => {
    expect(() =>
      CreateProjectSchema.parse({ name: "", inputDir: "/some/dir" }),
    ).toThrow();
  });

  it("rejects empty inputDir", () => {
    expect(() =>
      CreateProjectSchema.parse({ name: "Test", inputDir: "" }),
    ).toThrow();
  });

  it("accepts optional outputDir", () => {
    const result = CreateProjectSchema.parse({
      name: "Test",
      inputDir: "/some/dir",
      outputDir: "/output/dir",
    });
    expect(result.outputDir).toBe("/output/dir");
  });

  it("accepts without outputDir", () => {
    const result = CreateProjectSchema.parse({
      name: "Test",
      inputDir: "/some/dir",
    });
    expect(result.outputDir).toBeUndefined();
  });
});

describe("UpdateProjectSchema", () => {
  it("accepts valid outputDir", () => {
    const result = UpdateProjectSchema.parse({ outputDir: "/output/dir" });
    expect(result.outputDir).toBe("/output/dir");
  });

  it("rejects empty outputDir", () => {
    expect(() => UpdateProjectSchema.parse({ outputDir: "" })).toThrow();
  });

  it("rejects missing outputDir", () => {
    expect(() => UpdateProjectSchema.parse({})).toThrow();
  });
});
