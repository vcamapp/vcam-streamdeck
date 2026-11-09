import { action, type Action, type DialDownEvent, type DialRotateEvent } from "@elgato/streamdeck";

import type { VCam } from "../vcam/index.js";
import { t } from "../i18n.js";
import { TickAccumulator } from "./ticks.js";
import { VCamAction } from "./vcam-action.js";

type CameraZoomSettings = Record<string, never>;

const zoomPerTick = 1.03;

@action({ UUID: "com.vcamapp.vcam.camera-zoom" })
export class CameraZoomAction extends VCamAction<CameraZoomSettings> {
	readonly #ticks: TickAccumulator;

	constructor(vcam: VCam) {
		super(vcam);
		this.#ticks = new TickAccumulator(50, (id, ticks) => {
			const action = this.actions.find((action) => action.id === id);
			if (action) {
				// `zoom` is relative to the current view, so the ticks gathered meanwhile multiply into one step.
				void this.perform(action, () => this.vcam.client.call("camera.adjust", { zoom: zoomPerTick ** ticks }));
			}
		});
	}

	protected override async press(): Promise<void> {
		await this.vcam.client.call("camera.reset");
	}

	protected override async render(action: Action<CameraZoomSettings>): Promise<void> {
		if (action.isDial()) {
			await action.setFeedback({ title: t("Zoom"), value: this.vcam.client.isConnected ? "" : t("Offline") });
		}
	}

	override async onDialRotate(ev: DialRotateEvent<CameraZoomSettings>): Promise<void> {
		if (!this.vcam.client.isConnected) {
			await ev.action.showAlert();
			return;
		}
		this.#ticks.add(ev.action.id, ev.payload.ticks);
	}

	override async onDialDown(ev: DialDownEvent<CameraZoomSettings>): Promise<void> {
		await this.perform(ev.action, () => this.press());
	}
}
