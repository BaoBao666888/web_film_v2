import fs from "fs";
import path from "path";
import { ensureUploadDirs, TEMP_UPLOADS_ROOT } from "../utils/uploadFiles.js";

const MAX_TEMP_AGE_MS = 12 * 60 * 60 * 1000;

async function cleanupTempUploads() {
  try {
    ensureUploadDirs();
    const now = Date.now();
    const entries = await fs.promises.readdir(TEMP_UPLOADS_ROOT, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const filePath = path.join(TEMP_UPLOADS_ROOT, entry.name);
      try {
        const stat = await fs.promises.stat(filePath);
        if (now - stat.mtimeMs > MAX_TEMP_AGE_MS) {
          await fs.promises.unlink(filePath);
        }
      } catch (error) {
        if (error?.code !== "ENOENT") {
          console.error("[TempUploadJob] Failed to remove temp file:", error);
        }
      }
    }
  } catch (error) {
    console.error("[TempUploadJob] Error cleaning temp uploads:", error);
  }
}

export function startCleanupTempUploadsJob() {
  console.log("[TempUploadJob] Starting temp upload cleanup (hourly)");
  cleanupTempUploads();
  setInterval(cleanupTempUploads, 60 * 60 * 1000);
}
