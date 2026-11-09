import { action, type WillAppearEvent, type WillDisappearEvent } from "@elgato/streamdeck";

import type { VCam } from "../vcam/index.js";
import type { Snapshot } from "../vcam/state.js";
import type { VideoState } from "../vcam/types.js";
import { objectTitle } from "./data-sources.js";
import { MissingSettingError, VCamAction, type Look } from "./vcam-action.js";

type VideoSettings = {
	objectId?: string;
	fromStart?: boolean;
};

/**
 * VCam sends no event when a video starts, pauses, or ends, so the keys read the videos they show once a second.
 */
const pollInterval = 1000;

@action({ UUID: "com.vcamapp.vcam.video" })
export class VideoAction extends VCamAction<VideoSettings> {
	readonly #playing = new Map<number, boolean>();
	#timer?: NodeJS.Timeout;

	constructor(vcam: VCam) {
		super(vcam);
		vcam.client.onConnectionChange(() => this.#updatePolling());
	}

	protected override async press({ objectId, fromStart }: VideoSettings): Promise<void> {
		if (!objectId) {
			throw new MissingSettingError("video");
		}
		const id = Number(objectId);
		const isPlaying = !this.#playing.get(id);
		const state = await this.vcam.client.call<VideoState>("video.update", {
			objectId: id,
			isPlaying,
			...(isPlaying && (fromStart ?? true) ? { time: 0 } : {}),
		});
		this.#playing.set(id, state.isPlaying);
		this.refresh();
	}

	protected override look({ objectId }: VideoSettings, snapshot: Snapshot): Look {
		const object = snapshot.objects.find((object) => String(object.id) === objectId);
		return {
			on: object !== undefined && (this.#playing.get(object.id) ?? false),
			title: object && objectTitle(object, snapshot.objects),
		};
	}

	override async onWillAppear(ev: WillAppearEvent<VideoSettings>): Promise<void> {
		await super.onWillAppear(ev);
		this.#updatePolling();
	}

	override onWillDisappear(ev: WillDisappearEvent<VideoSettings>): void {
		super.onWillDisappear(ev);
		this.#updatePolling();
	}

	#updatePolling(): void {
		const shouldPoll = this.vcam.client.isConnected && [...this.actions].length > 0;
		if (shouldPoll && !this.#timer) {
			this.#timer = setInterval(() => void this.#poll(), pollInterval);
			void this.#poll();
		} else if (!shouldPoll && this.#timer) {
			clearInterval(this.#timer);
			this.#timer = undefined;
			this.#playing.clear();
		}
	}

	async #poll(): Promise<void> {
		const ids = new Set([...this.actions].map((action) => Number(this.settingsOf(action).objectId)).filter((id) => Number.isInteger(id)));
		let changed = false;
		for (const id of ids) {
			const state = await this.vcam.client.call<VideoState>("video.get", { objectId: id }).catch(() => undefined);
			const playing = state?.isPlaying ?? false;
			if (this.#playing.get(id) !== playing) {
				this.#playing.set(id, playing);
				changed = true;
			}
		}
		if (changed) {
			this.refresh();
		}
	}
}
