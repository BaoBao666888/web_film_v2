import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const UPLOADS_ROOT = path.join(__dirname, "../../uploads");
export const TEMP_UPLOADS_ROOT = path.join(UPLOADS_ROOT, "tmp");

export const TEMP_URL_PREFIX = "/uploads/tmp/";
export const UPLOAD_URL_PREFIX = "/uploads/";

export function ensureUploadDirs() {
  if (!fs.existsSync(UPLOADS_ROOT)) {
    fs.mkdirSync(UPLOADS_ROOT, { recursive: true });
  }
  if (!fs.existsSync(TEMP_UPLOADS_ROOT)) {
    fs.mkdirSync(TEMP_UPLOADS_ROOT, { recursive: true });
  }
}

function extractPathname(value) {
  if (!value || typeof value !== "string") return "";
  try {
    if (value.startsWith("http")) {
      return new URL(value).pathname;
    }
  } catch {
    // ignore invalid url
  }
  return value.split("?")[0];
}

function getOrigin(value) {
  if (!value || typeof value !== "string") return "";
  try {
    if (value.startsWith("http")) {
      return new URL(value).origin;
    }
  } catch {
    // ignore invalid url
  }
  return "";
}

export function isTempUploadUrl(value) {
  const pathname = extractPathname(value);
  return pathname.startsWith(TEMP_URL_PREFIX);
}

function getTempFilePath(value) {
  const pathname = extractPathname(value);
  if (!pathname.startsWith(TEMP_URL_PREFIX)) return "";
  const filename = path.basename(pathname);
  return path.join(TEMP_UPLOADS_ROOT, filename);
}

function buildPublicUrl(value, filename) {
  const origin = getOrigin(value);
  const suffix = `${UPLOAD_URL_PREFIX}${filename}`;
  return origin ? `${origin}${suffix}` : suffix;
}

export async function promoteTempUploadUrl(value) {
  if (!isTempUploadUrl(value)) {
    return { url: value, promotedPath: "" };
  }

  ensureUploadDirs();
  const pathname = extractPathname(value);
  const filename = path.basename(pathname);
  const tempPath = getTempFilePath(value);
  const targetPath = path.join(UPLOADS_ROOT, filename);
  if (!tempPath || !fs.existsSync(tempPath)) {
    if (fs.existsSync(targetPath)) {
      return { url: buildPublicUrl(value, filename), promotedPath: "" };
    }
    return { url: value, promotedPath: "" };
  }

  await fs.promises.rename(tempPath, targetPath);
  return { url: buildPublicUrl(value, filename), promotedPath: targetPath };
}

export async function removeTempUploadUrl(value) {
  if (!isTempUploadUrl(value)) return false;
  const tempPath = getTempFilePath(value);
  if (!tempPath) return false;
  try {
    await fs.promises.unlink(tempPath);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return true;
    throw error;
  }
}

export async function removeFileIfExists(filePath) {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
}
