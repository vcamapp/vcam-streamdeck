export type Avatar = { id: string; name: string };

export type Scene = { id: number; name: string };

export type Motion = { id: string; name: string; isLoop: boolean };

export type Expression = { name: string };

export type ExpressionWeight = { name: string; weight: number };

export type Shortcut = { id: string; title: string };

export type ObjectInfo = { id: number; type: string; name: string; isHidden: boolean };

export type AppState = {
	avatarId?: string;
	playingMotionIds: string[];
	subtitle: string;
	expressions: ExpressionWeight[];
};

export type RecordingStatus = "idle" | "recording" | "finishing";

export type RecordingState = { status: RecordingStatus; duration?: number };

export type TrackingStatus = "disconnected" | "connecting" | "connected";

export type TrackingState = { sources: { id: string; status: TrackingStatus }[] };

export type VideoState = { duration: number; time: number; isPlaying: boolean; isLooping: boolean; isMuted: boolean };

export type CameraView = { position: [number, number, number]; rotation: [number, number, number]; zoom: number };
