import { action } from "@elgato/streamdeck";

import type { Snapshot } from "../vcam/state.js";
import { MissingSettingError, VCamAction, type Look } from "./vcam-action.js";

type SubtitleSettings = {
	text?: string;
};

@action({ UUID: "com.vcamapp.vcam.subtitle" })
export class SubtitleAction extends VCamAction<SubtitleSettings> {
	protected override async press({ text }: SubtitleSettings): Promise<void> {
		if (!text) {
			throw new MissingSettingError("text");
		}
		if (this.vcam.state.snapshot.subtitle === text) {
			await this.vcam.client.call("subtitle.clear");
		} else {
			await this.vcam.client.call("subtitle.set", { text });
		}
	}

	protected override look({ text }: SubtitleSettings, snapshot: Snapshot): Look {
		return { on: text !== undefined && text !== "" && snapshot.subtitle === text };
	}
}
