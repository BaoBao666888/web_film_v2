import watchPartyService from "../services/watchParty.service.js";

/**
 * WatchParty Controller - HTTP Request/Response Handler
 */
class WatchPartyController {
  /**
   * Create a new watch party room
   * POST /watch-party
   */
  async createRoom(req, res) {
    try {
      const {
        movieId,
        episodeNumber,
        title,
        poster,
        isLive = false,
        isPrivate = false,
        autoStart = true,
        currentPosition = 0,
        participant,
      } = req.body || {};

      if (!movieId || !title) {
        return res.status(400).json({ message: "Thiếu dữ liệu bắt buộc." });
      }

      const hostId = req.user?.id;
      const hostName = req.user?.name || "Ẩn danh";
      if (!hostId) {
        return res
          .status(401)
          .json({ message: "Bạn cần đăng nhập để tạo phòng" });
      }

      const room = await watchPartyService.createRoom({
        movieId,
        episodeNumber,
        title,
        poster,
        hostId,
        hostName,
        isLive,
        isPrivate,
        autoStart,
        currentPosition,
        participant,
      });

      res.json(room);
    } catch (error) {
      console.error("Error creating room:", error);
      res.status(500).json({ message: "Lỗi khi tạo phòng xem chung" });
    }
  }

  /**
   * Get list of public rooms
   * GET /watch-party/public
   */
  async getPublicRooms(req, res) {
    try {
      const rooms = await watchPartyService.getPublicRooms(100);
      res.json(rooms);
    } catch (error) {
      console.error("Error getting public rooms:", error);
      res
        .status(500)
        .json({ message: "Lỗi khi lấy danh sách phòng công khai" });
    }
  }

  /**
   * Get list of private rooms for a viewer
   * GET /watch-party/private?viewerId=xxx
   */
  async getPrivateRooms(req, res) {
    try {
      const viewerId = req.query.viewerId;
      if (!viewerId) {
        return res.status(400).json({ message: "Thiếu viewerId" });
      }

      const rooms = await watchPartyService.getPrivateRooms(viewerId, 50);
      res.json(rooms);
    } catch (error) {
      console.error("Error getting private rooms:", error);
      res.status(500).json({ message: "Lỗi khi lấy danh sách phòng riêng tư" });
    }
  }

  /**
   * Get room by ID
   * GET /watch-party/:id
   */
  async getRoomById(req, res) {
    try {
      const room = await watchPartyService.getRoomById(req.params.id);
      if (!room) {
        return res.status(404).json({ message: "Phòng không tồn tại" });
      }
      res.json(room);
    } catch (error) {
      console.error("Error getting room:", error);
      res.status(500).json({ message: "Lỗi khi lấy thông tin phòng" });
    }
  }

  /**
   * Join a room
   * POST /watch-party/:id/join
   */
  async joinRoom(req, res) {
    try {
      const viewerId = req.body?.viewerId || req.user?.id;
      const name = req.body?.name || req.user?.name;

      if (!viewerId) {
        return res.status(400).json({ message: "Thiếu viewerId" });
      }

      const room = await watchPartyService.joinRoom(
        req.params.id,
        viewerId,
        name
      );
      if (!room) {
        return res.status(404).json({ message: "Phòng không tồn tại" });
      }

      res.json(room);
    } catch (error) {
      console.error("Error joining room:", error);
      res.status(500).json({ message: "Lỗi khi tham gia phòng" });
    }
  }

  /**
   * Send heartbeat
   * POST /watch-party/:id/heartbeat
   */
  async heartbeat(req, res) {
    try {
      const viewerId = req.body?.viewerId || req.user?.id;

      if (!viewerId) {
        return res.status(400).json({ message: "Thiếu viewerId" });
      }

      const room = await watchPartyService.heartbeat(req.params.id, viewerId);
      if (!room) {
        return res.status(404).json({ message: "Phòng không tồn tại" });
      }

      res.json(room);
    } catch (error) {
      console.error("Error sending heartbeat:", error);
      res.status(500).json({ message: "Lỗi khi gửi heartbeat" });
    }
  }

  /**
   * Update playback state
   * POST /watch-party/:id/state
   */
  async updateState(req, res) {
    try {
      const { position, isPlaying, playbackRate } = req.body || {};
      const viewerId = req.body?.viewerId || req.user?.id;
      const roomId = req.params.id;

      if (!viewerId) {
        return res.status(400).json({ message: "Thiếu viewerId" });
      }

      const room = await watchPartyService.getRoomById(roomId);
      if (!room) {
        return res.status(404).json({ message: "Phòng không tồn tại" });
      }

      // Check authorization
      const isHost = watchPartyService.isHost(room, viewerId);
      if (room.isLive && !isHost) {
        return res.status(403).json({
          message: "Phòng đang ở chế độ Live, chỉ host được chỉnh.",
        });
      }
      if (isHost && req.user?.id !== room.hostId) {
        return res.status(403).json({
          message: "Bạn cần đăng nhập bằng tài khoản host",
        });
      }

      const updated = await watchPartyService.updateState(roomId, viewerId, {
        position,
        isPlaying,
        playbackRate,
      });

      if (!updated) {
        return res.status(404).json({ message: "Phòng không tồn tại" });
      }

      res.json(updated.state);
    } catch (error) {
      console.error("Error updating state:", error);
      res.status(500).json({ message: "Lỗi khi cập nhật trạng thái" });
    }
  }

  /**
   * Update room settings
   * PATCH /watch-party/:id/settings
   */
  async updateSettings(req, res) {
    try {
      const { isLive } = req.body || {};
      const roomId = req.params.id;

      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "Bạn cần đăng nhập" });
      }

      const room = await watchPartyService.getRoomById(roomId);
      if (!room) {
        return res.status(404).json({ message: "Phòng không tồn tại" });
      }

      if (!watchPartyService.canUpdateSettings(room, req.user.id)) {
        return res.status(403).json({
          message: "Chỉ host (đã đăng nhập) được chỉnh cài đặt",
        });
      }

      const updated = await watchPartyService.updateSettings(roomId, {
        isLive,
      });
      if (!updated) {
        return res.status(404).json({ message: "Phòng không tồn tại" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ message: "Lỗi khi cập nhật cài đặt" });
    }
  }

  /**
   * Send chat message
   * POST /watch-party/:id/chat
   */
  async sendMessage(req, res) {
    try {
      const { userName, content } = req.body || {};
      const viewerId = req.body?.viewerId || req.user?.id;

      if (!viewerId || !content) {
        return res
          .status(400)
          .json({ message: "Thiếu viewerId hoặc nội dung" });
      }

      const room = await watchPartyService.sendMessage(
        req.params.id,
        viewerId,
        userName || req.user?.name,
        content
      );

      if (!room) {
        return res.status(404).json({ message: "Phòng không tồn tại" });
      }

      res.json(room.messages);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Lỗi khi gửi tin nhắn" });
    }
  }

  /**
   * Delete a room
   * DELETE /watch-party/:id
   */
  async deleteRoom(req, res) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "Bạn cần đăng nhập" });
      }

      const room = await watchPartyService.getRoomById(req.params.id);
      if (!room) {
        return res.status(404).json({ message: "Phòng không tồn tại" });
      }

      if (!watchPartyService.canDeleteRoom(room, req.user.id)) {
        return res.status(403).json({
          message: "Chỉ host (đã đăng nhập) được xóa phòng",
        });
      }

      await watchPartyService.deleteRoom(req.params.id);
      res.json({ message: "Đã xóa phòng" });
    } catch (error) {
      console.error("Error deleting room:", error);
      res.status(500).json({ message: "Lỗi khi xóa phòng" });
    }
  }
}

export default new WatchPartyController();
