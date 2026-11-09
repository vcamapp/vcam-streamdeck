import { action } from "@elgato/streamdeck";

import type { Snapshot } from "../vcam/state.js";
import { sceneTitle } from "./data-sources.js";
import { fade } from "./fade.js";
import { MissingSettingError, VCamAction, type Look } from "./vcam-action.js";

type SceneSettings = {
	sceneId?: string;
	duration?: number;
};

@action({ UUID: "com.vcamapp.vcam.scene" })
export class SceneAction extends VCamAction<SceneSettings> {
	protected override async press({ sceneId, duration }: SceneSettings): Promise<void> {
		if (!sceneId) {
			throw new MissingSettingError("scene");
		}
		await this.vcam.client.call("scene.load", { sceneId: Number(sceneId), ...fade(duration) });
	}

	protected override look({ sceneId }: SceneSettings, snapshot: Snapshot): Look {
		const id = Number(sceneId);
		const index = snapshot.scenes.findIndex((scene) => scene.id === id);
		return {
			on: sceneId !== undefined && snapshot.sceneId === id,
			title: index < 0 ? undefined : sceneTitle(snapshot.scenes[index]!, index),
		};
	}
}
