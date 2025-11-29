export type WatchPartyParticipant = {
  userId: string;
  name: string;
  joinedAt: number;
  lastSeen: number;
};

export type WatchPartyMessage = {
  userId: string;
  userName: string;
  content: string;
  createdAt: number;
};

export type WatchPartyRoom = {
  _id?: string;
  roomId: string;
  movieId: string;
  episodeNumber?: number;
  title: string;
  poster?: string;
  hostId: string;
  hostName: string;
  allowViewerControl: boolean;
  allowDownload: boolean;
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
  createdAt?: string;
  updatedAt?: string;
};
