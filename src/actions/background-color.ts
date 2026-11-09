import { action } from "@elgato/streamdeck";

import { MissingSettingError, VCamAction } from "./vcam-action.js";

type BackgroundColorSettings = {
	color?: string;
};

@action({ UUID: "com.vcamapp.vcam.background-color" })
export class BackgroundColorAction extends VCamAction<BackgroundColorSettings> {
	protected override readonly requirement = { since: "0.1.1", methods: ["canvas.setBackgroundColor"] };

	protected override async press({ color }: BackgroundColorSettings): Promise<void> {
		if (!color) {
			throw new MissingSettingError("color");
		}
		await this.vcam.client.call("canvas.setBackgroundColor", { color });
	}
}
