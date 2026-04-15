import * as fs from "fs/promises";
import * as path from "path";
import type AdmZip from "adm-zip";

export const VALID_DOMAINS = new Set([
  "teaching",
  "sales",
  "customer-service",
  "reference",
  "internal",
]);

const MAX_UNCOMPRESSED_SIZE = 50 * 1024 * 1024;
const MAX_FILE_COUNT = 500;
const MAX_COMPRESSION_RATIO = 100;

export function assertSafePath(corpusDir: string, ...segments: string[]): string {
  const resolved = path.resolve(corpusDir, ...segments);
  const rel = path.relative(path.resolve(corpusDir), resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("Path traversal detected - path escapes corpus directory.");
  }
  return resolved;
}

export function assertValidSlug(slug: string): void {
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) || slug.length > 100) {
    throw new Error(
      `Invalid slug: "${slug}". Must be lowercase alphanumeric with hyphens, 2-100 chars.`,
    );
  }
}

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error.code === "ENOENT" || error.code === "ENOTDIR")
    ) {
      return false;
    }

    throw error;
  }
}

export function validateZipSafety(entries: AdmZip.IZipEntry[]): void {
  if (entries.length > MAX_FILE_COUNT) {
    throw new Error(`Zip exceeds maximum file count (${MAX_FILE_COUNT}).`);
  }

  let totalUncompressed = 0;
  let totalCompressed = 0;

  for (const entry of entries) {
    if (entry.entryName.includes("..")) {
      throw new Error(`Path traversal in zip entry: "${entry.entryName}"`);
    }
    if (path.isAbsolute(entry.entryName)) {
      throw new Error(`Absolute path in zip entry: "${entry.entryName}"`);
    }

    try {
      decodeURIComponent(encodeURIComponent(entry.entryName));
    } catch {
      // Treat any filename that cannot round-trip through UTF-8 encoding as unsafe input.
      throw new Error(`Non-UTF-8 filename in zip: "${entry.entryName}"`);
    }

    totalUncompressed += entry.header.size;
    totalCompressed += entry.header.compressedSize;

    if (totalUncompressed > MAX_UNCOMPRESSED_SIZE) {
      throw new Error(
        `Zip exceeds ${MAX_UNCOMPRESSED_SIZE / 1024 / 1024} MB uncompressed limit.`,
      );
    }

    const externalAttr = entry.header.attr >>> 16;
    if ((externalAttr & 0o170000) === 0o120000) {
      throw new Error(`Symlinks not allowed in zip: "${entry.entryName}"`);
    }
  }

  if (totalCompressed > 0 && totalUncompressed / totalCompressed > MAX_COMPRESSION_RATIO) {
    throw new Error("Suspicious compression ratio - possible zip bomb.");
  }
}