import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from "@/lib/constants";
import { saveFile, UploadError, validateFile } from "@/lib/uploads";

vi.mock("node:fs", () => ({ existsSync: vi.fn() }));
vi.mock("node:fs/promises", () => ({ mkdir: vi.fn(), writeFile: vi.fn() }));
vi.mock("uuid", () => ({ v4: vi.fn(() => "fixed-uuid") }));

function imageFile(overrides = {}) {
  return {
    name: "festival.png",
    size: 4,
    type: "image/png",
    arrayBuffer: vi.fn(async () => Uint8Array.from([1, 2, 3, 4]).buffer),
    ...overrides,
  };
}

describe("validateFile", () => {
  it("accepts every configured image type at the maximum size", () => {
    for (const type of ALLOWED_FILE_TYPES) {
      expect(() => validateFile(imageFile({ type, size: MAX_FILE_SIZE }))).not.toThrow();
    }
  });

  it("reports missing, oversized, and unsupported files as upload errors", () => {
    expect(() => validateFile()).toThrowError(new UploadError("No file provided"));
    expect(() => validateFile(imageFile({ size: MAX_FILE_SIZE + 1 }))).toThrow(
      "File too large. Maximum size is 5MB"
    );
    expect(() => validateFile(imageFile({ type: "text/plain" }))).toThrow(
      `Invalid file type. Allowed: ${ALLOWED_FILE_TYPES.join(", ")}`
    );
  });
});

describe("saveFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(process, "cwd").mockReturnValue("/workspace/app");
  });

  it("creates a sanitized upload directory and writes a UUID-named file", async () => {
    vi.mocked(existsSync).mockReturnValue(false);
    const file = imageFile();

    const result = await saveFile(file, "../festival images");

    expect(mkdir).toHaveBeenCalledWith("/workspace/app/public/festivalimages", {
      recursive: true,
    });
    expect(writeFile).toHaveBeenCalledWith(
      "/workspace/app/public/festivalimages/fixed-uuid.png",
      Buffer.from([1, 2, 3, 4])
    );
    expect(result).toEqual({
      url: "/festivalimages/fixed-uuid.png",
      fileName: "fixed-uuid.png",
      size: 4,
      type: "image/png",
    });
    expect(file.arrayBuffer).toHaveBeenCalledOnce();
  });

  it("does not recreate an existing directory and supplies a fallback extension", async () => {
    vi.mocked(existsSync).mockReturnValue(true);

    const result = await saveFile(imageFile({ name: "festival" }));

    expect(mkdir).not.toHaveBeenCalled();
    expect(result.fileName).toBe("fixed-uuid.bin");
    expect(result.url).toBe("/uploads/fixed-uuid.bin");
  });

  it("rejects a directory that becomes empty after sanitization", async () => {
    await expect(saveFile(imageFile(), "../")).rejects.toMatchObject({
      name: "UploadError",
      message: "Invalid directory name",
      statusCode: 400,
    });
    expect(writeFile).not.toHaveBeenCalled();
  });
});
