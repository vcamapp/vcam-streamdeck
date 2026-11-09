import { action } from "@elgato/streamdeck";

import { VCamAction } from "./vcam-action.js";

@action({ UUID: "com.vcamapp.vcam.camera-reset" })
export class CameraResetAction extends VCamAction<Record<string, never>> {
	protected override async press(): Promise<void> {
		await this.vcam.client.call("camera.reset");
	}
}
