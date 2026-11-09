import type { VCamClient, VCamEvent } from "./client.js";
import type {
	AppState,
	Avatar,
	ExpressionWeight,
	Motion,
	ObjectInfo,
	RecordingState,
	RecordingStatus,
	Scene,
	Shortcut,
	TrackingState,
	TrackingStatus,
} from "./types.js";

export type Snapshot = {
	apiVersion?: string;
	avatarId?: string;
	sceneId?: number;
	expressions: ExpressionWeight[];
	playingMotionIds: ReadonlySet<string>;
	subtitle: string;
	recording: RecordingStatus;
	recordingStartedAt?: number;
	runningShortcutIds: ReadonlySet<string>;
	scenes: Scene[];
	motions: Motion[];
	shortcuts: Shortcut[];
	objects: ObjectInfo[];
	avatars: Avatar[];
	tracking: Readonly<Record<string, TrackingStatus>>;
};

const emptySnapshot: Snapshot = {
	expressions: [],
	playingMotionIds: new Set(),
	subtitle: "",
	recording: "idle",
	runningShortcutIds: new Set(),
	scenes: [],
	motions: [],
	shortcuts: [],
	objects: [],
	avatars: [],
	tracking: {},
};

/**
 * What the keys show, kept from the state VCam reports on connecting and the events after it.
 */
export class VCamState {
	readonly #client: VCamClient;
	readonly #listeners = new Set<() => void>();
	#snapshot = emptySnapshot;
	#loadGeneration = 0;

	constructor(client: VCamClient) {
		this.#client = client;
		client.onConnectionChange((connected) => {
			if (connected) {
				void this.#load();
			} else {
				this.#loadGeneration++;
				this.#update(emptySnapshot);
			}
		});
		client.onEvent((event) => this.apply(event));
	}

	get snapshot(): Snapshot {
		return this.#snapshot;
	}

	onChange(listener: () => void): () => void {
		this.#listeners.add(listener);
		return () => this.#listeners.delete(listener);
	}

	apply(event: VCamEvent): void {
		const { params } = event;
		const snapshot = this.#snapshot;
		switch (event.method) {
			case "scene.loaded":
				this.#update({ ...snapshot, sceneId: params.sceneId as number });
				void this.#fetch("scene.list", (scenes: Scene[]) => ({ scenes }));
				break;
			case "expression.changed":
				this.#update({ ...snapshot, expressions: params.expressions as ExpressionWeight[] });
				break;
			case "motion.started":
				this.#update({ ...snapshot, playingMotionIds: adding(snapshot.playingMotionIds, params.motionId as string) });
				break;
			case "motion.stopped":
				this.#update({ ...snapshot, playingMotionIds: removing(snapshot.playingMotionIds, params.motionId as string) });
				break;
			case "subtitle.changed":
				this.#update({ ...snapshot, subtitle: params.text as string });
				break;
			case "shortcut.started":
				this.#update({ ...snapshot, runningShortcutIds: adding(snapshot.runningShortcutIds, params.shortcutId as string) });
				break;
			case "shortcut.finished":
				this.#update({ ...snapshot, runningShortcutIds: removing(snapshot.runningShortcutIds, params.shortcutId as string) });
				break;
			case "shortcuts.changed":
				this.#update({ ...snapshot, shortcuts: params.shortcuts as Shortcut[] });
				break;
			case "recording.started":
				this.#update({ ...snapshot, recording: "recording", recordingStartedAt: Date.now() });
				break;
			case "recording.stopped":
				this.#update({ ...snapshot, recording: "idle", recordingStartedAt: undefined });
				break;
			case "objects.changed":
				void this.#fetch("object.list", (objects: ObjectInfo[]) => ({ objects }));
				break;
			case "avatar.loaded":
				this.#update({ ...snapshot, avatarId: params.avatarId as string | undefined });
				void this.#fetch("motion.list", (motions: Motion[]) => ({ motions }));
				void this.#fetch("avatar.list", (avatars: Avatar[]) => ({ avatars }));
				break;
			case "tracking.connected":
				this.#update({ ...snapshot, tracking: { ...snapshot.tracking, [params.sourceId as string]: "connected" } });
				break;
			case "tracking.disconnected":
				// The source is left waiting for data again, and only `tracking.getState` tells whether it still listens.
				void this.#fetch("tracking.getState", (tracking: TrackingState) => ({ tracking: trackingStatuses(tracking) }));
				break;
		}
	}

	async #load(): Promise<void> {
		const generation = ++this.#loadGeneration;
		const [info, scene, app, recording, scenes, motions, shortcuts, objects, avatars, tracking] = await Promise.all([
			this.#get<{ apiVersion: string }>("app.getInfo"),
			this.#get<Scene>("scene.get"),
			this.#get<AppState>("state.get"),
			this.#get<RecordingState>("recording.getState"),
			this.#get<Scene[]>("scene.list"),
			this.#get<Motion[]>("motion.list"),
			this.#get<Shortcut[]>("shortcut.list"),
			this.#get<ObjectInfo[]>("object.list"),
			this.#get<Avatar[]>("avatar.list"),
			this.#get<TrackingState>("tracking.getState"),
		]);
		if (generation !== this.#loadGeneration) {
			return;
		}
		this.#update({
			...emptySnapshot,
			apiVersion: info?.apiVersion,
			avatarId: app?.avatarId,
			sceneId: scene?.id,
			expressions: app?.expressions ?? [],
			playingMotionIds: new Set(app?.playingMotionIds),
			subtitle: app?.subtitle ?? "",
			recording: recording?.status ?? "idle",
			recordingStartedAt: recording?.duration === undefined ? undefined : Date.now() - recording.duration * 1000,
			scenes: scenes ?? [],
			motions: motions ?? [],
			shortcuts: shortcuts ?? [],
			objects: objects ?? [],
			avatars: avatars ?? [],
			tracking: tracking ? trackingStatuses(tracking) : {},
		});
	}

	async #fetch<T>(method: string, change: (value: T) => Partial<Snapshot>): Promise<void> {
		const generation = this.#loadGeneration;
		const value = await this.#get<T>(method);
		if (value !== undefined && generation === this.#loadGeneration) {
			this.#update({ ...this.#snapshot, ...change(value) });
		}
	}

	async #get<T>(method: string): Promise<T | undefined> {
		if (!this.#client.supports(method)) {
			return undefined;
		}
		return this.#client.call<T>(method).catch(() => undefined);
	}

	#update(snapshot: Snapshot): void {
		this.#snapshot = snapshot;
		this.#listeners.forEach((listener) => listener());
	}
}

function trackingStatuses({ sources }: TrackingState): Record<string, TrackingStatus> {
	return Object.fromEntries(sources.map((source) => [source.id, source.status]));
}

function adding<T>(set: ReadonlySet<T>, value: T): ReadonlySet<T> {
	return new Set(set).add(value);
}

function removing<T>(set: ReadonlySet<T>, value: T): ReadonlySet<T> {
	const result = new Set(set);
	result.delete(value);
	return result;
}
