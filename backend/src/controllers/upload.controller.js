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

      const fileUrl = `/uploads/${req.file.filename}`;
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
}

export default new UploadController();
