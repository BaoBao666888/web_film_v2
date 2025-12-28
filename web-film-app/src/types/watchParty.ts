export type WatchPartyParticipant = {
  id?: string;
  userId: string;
  name: string;
  joinedAt: number;
  lastSeen: number;
};

export type WatchPartyMessage = {
  id?: string;
  userId: string;
  userName: string;
  content: string;
  position?: number;
  createdAt: number;
};

export type WatchPartyRoom = {
  id?: string;
  _id?: string;
  roomId: string;
  movieId: string;
  episodeNumber?: number;
  title: string;
  poster?: string;
  hostId: string;
  hostName: string;
  allowViewerControl?: boolean;
  allowDownload?: boolean;
  isLive: boolean;
  isPrivate: boolean;
  autoStart: boolean;
  currentPosition: number;
  state?: {
    position: number;
    isPlaying: boolean;
    playbackRate: number;
    updatedAt: number;
  };
  participants: WatchPartyParticipant[];
  messages: WatchPartyMessage[];
  lastActive: number;
  createdAt?: number | string;
  updatedAt?: number | string;
};
