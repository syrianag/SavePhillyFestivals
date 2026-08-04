import { createHash, randomUUID } from "node:crypto";

import { ASSET_RIGHTS_VERSION, PRODUCER_ASSET_MAX_BYTES } from "./producer-submission-schema";
import { ProducerSubmissionError } from "./producer-submission-errors";

const MAX_IMAGE_DIMENSION = 12_000;
const MAX_IMAGE_PIXELS = 40_000_000;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function dimensionsAllowed(width, height) {
  return Number.isInteger(width) && Number.isInteger(height) && width > 0 && height > 0
    && width <= MAX_IMAGE_DIMENSION && height <= MAX_IMAGE_DIMENSION
    && width * height <= MAX_IMAGE_PIXELS;
}

function parsePng(bytes) {
  const buffer = Buffer.from(bytes);
  if (buffer.length < 45 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) return null;
  let offset = 8;
  let dimensions = null;
  let sawIend = false;
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const end = offset + 12 + length;
    if (end > buffer.length) return null;
    if (!dimensions) {
      if (type !== "IHDR" || length !== 13) return null;
      dimensions = { width: buffer.readUInt32BE(offset + 8), height: buffer.readUInt32BE(offset + 12) };
    }
    if (type === "IEND") {
      if (length !== 0 || end !== buffer.length) return null;
      sawIend = true;
      break;
    }
    offset = end;
  }
  return sawIend && dimensionsAllowed(dimensions?.width, dimensions?.height) ? dimensions : null;
}

function parseJpeg(bytes) {
  const buffer = Buffer.from(bytes);
  if (buffer.length < 12 || buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer.at(-2) !== 0xff || buffer.at(-1) !== 0xd9) return null;
  let offset = 2;
  let dimensions = null;
  while (offset < buffer.length - 2) {
    if (buffer[offset] !== 0xff) return null;
    while (buffer[offset] === 0xff) offset += 1;
    const marker = buffer[offset++];
    if (marker === 0xd9) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > buffer.length) return null;
    const length = buffer.readUInt16BE(offset);
    if (length < 2 || offset + length > buffer.length) return null;
    if (marker === 0xda) return dimensionsAllowed(dimensions?.width, dimensions?.height) ? dimensions : null;
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      if (length < 7) return null;
      dimensions = { height: buffer.readUInt16BE(offset + 3), width: buffer.readUInt16BE(offset + 5) };
    }
    offset += length;
  }
  return dimensionsAllowed(dimensions?.width, dimensions?.height) ? dimensions : null;
}

function uint24le(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
}

function webpDimensions(type, payload) {
  if (type === "VP8X" && payload.length >= 10) {
    return { width: uint24le(payload, 4) + 1, height: uint24le(payload, 7) + 1 };
  }
  if (type === "VP8L" && payload.length >= 5 && payload[0] === 0x2f) {
    const bits = payload.readUInt32LE(1);
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  if (type === "VP8 " && payload.length >= 10 && payload[3] === 0x9d && payload[4] === 0x01 && payload[5] === 0x2a) {
    return { width: payload.readUInt16LE(6) & 0x3fff, height: payload.readUInt16LE(8) & 0x3fff };
  }
  return null;
}

function parseWebp(bytes) {
  const buffer = Buffer.from(bytes);
  if (buffer.length < 20 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") return null;
  if (buffer.readUInt32LE(4) + 8 !== buffer.length) return null;
  let offset = 12;
  let dimensions = null;
  while (offset + 8 <= buffer.length) {
    const type = buffer.toString("ascii", offset, offset + 4);
    const length = buffer.readUInt32LE(offset + 4);
    const payloadStart = offset + 8;
    const end = payloadStart + length;
    if (end > buffer.length) return null;
    dimensions ||= webpDimensions(type, buffer.subarray(payloadStart, end));
    offset = end + (length % 2);
  }
  if (offset !== buffer.length || !dimensionsAllowed(dimensions?.width, dimensions?.height)) return null;
  return dimensions;
}

const FILE_TYPES = Object.freeze({
  "image/jpeg": { extension: "jpg", parse: parseJpeg },
  "image/png": { extension: "png", parse: parsePng },
  "image/webp": { extension: "webp", parse: parseWebp },
});

export async function preparePrivateAsset(file, metadata, { createId = randomUUID } = {}) {
  if (!file || typeof file.arrayBuffer !== "function") throw new ProducerSubmissionError("A file is required.", 400, "invalid_asset");
  if (!Number.isSafeInteger(file.size) || file.size <= 0 || file.size > PRODUCER_ASSET_MAX_BYTES) {
    throw new ProducerSubmissionError("Asset size is invalid.", 413, "invalid_asset_size");
  }
  const fileType = FILE_TYPES[file.type];
  if (!fileType) throw new ProducerSubmissionError("Asset media type is not allowed.", 415, "invalid_asset_type");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const dimensions = bytes.byteLength === file.size ? fileType.parse(bytes) : null;
  if (!dimensions) {
    throw new ProducerSubmissionError("Asset is truncated, malformed, or outside image dimension limits.", 400, "invalid_asset_structure");
  }

  const id = createId();
  return {
    id,
    bytes,
    serverFilename: `${id}.${fileType.extension}`,
    originalFilename: String(file.name || "upload").slice(0, 255),
    mimeType: file.type,
    byteSize: bytes.byteLength,
    checksumSha256: createHash("sha256").update(bytes).digest("hex"),
    width: dimensions.width,
    height: dimensions.height,
    purpose: metadata.purpose,
    altText: metadata.alt_text,
    rightsVersion: ASSET_RIGHTS_VERSION,
  };
}
