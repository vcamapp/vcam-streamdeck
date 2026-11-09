import { action } from "@elgato/streamdeck";

import type { Snapshot } from "../vcam/state.js";
import { objectTitle } from "./data-sources.js";
import { fade } from "./fade.js";
import { MissingSettingError, VCamAction, type Look } from "./vcam-action.js";

type ObjectVisibilitySettings = {
	objectId?: string;
	duration?: number;
};

@action({ UUID: "com.vcamapp.vcam.object-visibility" })
export class ObjectVisibilityAction extends VCamAction<ObjectVisibilitySettings> {
	protected override async press({ objectId, duration }: ObjectVisibilitySettings): Promise<void> {
		if (!objectId) {
			throw new MissingSettingError("object");
		}
		const object = this.vcam.state.snapshot.objects.find((object) => String(object.id) === objectId);
		await this.vcam.client.call("object.update", {
			objectId: Number(objectId),
			isHidden: !(object?.isHidden ?? false),
			...fade(duration),
		});
	}

	protected override look({ objectId }: ObjectVisibilitySettings, snapshot: Snapshot): Look {
		const object = snapshot.objects.find((object) => String(object.id) === objectId);
		return { on: object !== undefined && !object.isHidden, title: object && objectTitle(object, snapshot.objects) };
	}
}
