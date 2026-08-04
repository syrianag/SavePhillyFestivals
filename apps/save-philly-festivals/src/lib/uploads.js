import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { MAX_FILE_SIZE, ALLOWED_FILE_TYPES } from "@/lib/constants";

export class UploadError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.name = "UploadError";
  }
}

export function validateFile(file) {
  if (!file) {
    throw new UploadError("No file provided");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new UploadError(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    throw new UploadError(`Invalid file type. Allowed: ${ALLOWED_FILE_TYPES.join(", ")}`);
  }
}

const SAFE_DIRECTORY_PATTERN = /^[a-zA-Z0-9_-]+$/;

export async function saveFile(file, directory = "uploads") {
  validateFile(file);

  const sanitizedDir = directory.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!sanitizedDir || !SAFE_DIRECTORY_PATTERN.test(sanitizedDir)) {
    throw new UploadError("Invalid directory name");
  }

  const uploadDir = path.join(process.cwd(), "public", sanitizedDir);

  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
  }

  const ext = path.extname(file.name) || ".bin";
  const fileName = `${uuidv4()}${ext}`;
  const filePath = path.join(uploadDir, fileName);
  const fileUrl = `/${sanitizedDir}/${fileName}`;

  const bytes = await file.arrayBuffer();
  await writeFile(filePath, Buffer.from(bytes));

  return {
    url: fileUrl,
    fileName,
    size: file.size,
    type: file.type,
  };
}
