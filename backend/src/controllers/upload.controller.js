import { isTempUploadUrl, removeTempUploadUrl } from "../utils/uploadFiles.js";

/**
 * Upload Controller - Handle file uploads
 */
class UploadController {
  /**
   * Upload a single file
   * POST /upload/single
   */
  async uploadSingle(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileUrl = `/uploads/tmp/${req.file.filename}`;
      const fullUrl = `${req.protocol}://${req.get("host")}${fileUrl}`;

      res.json({
        message: "File uploaded successfully",
        filename: req.file.filename,
        url: fileUrl,
        fullUrl: fullUrl,
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  }

  /**
   * Delete a temp upload
   * DELETE /upload/temp
   */
  async deleteTemp(req, res) {
    try {
      const { url } = req.body || {};
      if (!url || typeof url !== "string") {
        return res.status(400).json({ message: "Missing temp url" });
      }

      if (!isTempUploadUrl(url)) {
        return res.status(400).json({ message: "Not a temp upload url" });
      }

      await removeTempUploadUrl(url);
      return res.json({ deleted: true });
    } catch (error) {
      console.error("Error deleting temp upload:", error);
      res.status(500).json({ message: "Failed to delete temp upload" });
    }
  }
}

export default new UploadController();
