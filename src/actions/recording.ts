import { action } from "@elgato/streamdeck";

import type { VCam } from "../vcam/index.js";
import type { Snapshot } from "../vcam/state.js";
import { elapsed } from "./elapsed.js";
import { VCamAction, type Look } from "./vcam-action.js";

type RecordingSettings = Record<string, never>;

@action({ UUID: "com.vcamapp.vcam.recording" })
export class RecordingAction extends VCamAction<RecordingSettings> {
	protected override readonly requirement = { since: "0.1.1", methods: ["recording.getState", "recording.start", "recording.stop"] };

	#timer?: NodeJS.Timeout;

	constructor(vcam: VCam) {
		super(vcam);
		vcam.state.onChange(() => this.#updateTimer());
	}

	protected override async press(): Promise<void> {
		const { recording } = this.vcam.state.snapshot;
		if (recording === "finishing") {
			return;
		}
		await this.vcam.client.call(recording === "recording" ? "recording.stop" : "recording.start");
	}

	protected override look(_settings: RecordingSettings, snapshot: Snapshot): Look {
		const recording = snapshot.recording === "recording";
		return {
			on: recording,
			title: recording && snapshot.recordingStartedAt !== undefined ? elapsed(Date.now() - snapshot.recordingStartedAt) : undefined,
		};
	}

	#updateTimer(): void {
		const recording = this.vcam.state.snapshot.recording === "recording";
		if (recording && !this.#timer) {
			this.#timer = setInterval(() => this.refresh(), 1000);
		} else if (!recording && this.#timer) {
			clearInterval(this.#timer);
			this.#timer = undefined;
		}
	}
}
