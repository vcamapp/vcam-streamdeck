import { action, type KeyDownEvent, type KeyUpEvent, type SendToPluginEvent } from "@elgato/streamdeck";
import type { JsonValue } from "@elgato/utils";

import type { CameraView } from "../vcam/types.js";
import { fade } from "./fade.js";
import { VCamAction } from "./vcam-action.js";

type CameraPresetSettings = {
	view?: CameraView;
	duration?: number;
};

/**
 * Holding the key this long saves the view on screen instead of moving to the saved one.
 */
const holdToSave = 800;

/**
 * The move a key makes before its settings are opened, matching the property inspector's default.
 */
const defaultDuration = 0.5;

export class MissingViewError extends Error {
	constructor() {
		super("Save a view first: hold the key, or use Save the current view in the action's settings.");
	}
}

/**
 * Moves the camera to a saved view. Since a hold has to be told from a press, the key acts when it is released.
 */
@action({ UUID: "com.vcamapp.vcam.camera-preset" })
export class CameraPresetAction extends VCamAction<CameraPresetSettings> {
	protected override readonly requirement = { since: "0.1.1", methods: ["camera.get", "camera.set"] };

	readonly #pressedAt = new Map<string, number>();

	protected override async press({ view, duration }: CameraPresetSettings): Promise<void> {
		if (!view) {
			throw new MissingViewError();
		}
		await this.vcam.client.call("camera.set", { ...view, ...fade(duration ?? defaultDuration) });
	}

	override async onKeyDown(ev: KeyDownEvent<CameraPresetSettings>): Promise<void> {
		this.#pressedAt.set(ev.action.id, Date.now());
	}

	override async onKeyUp(ev: KeyUpEvent<CameraPresetSettings>): Promise<void> {
		const pressedAt = this.#pressedAt.get(ev.action.id);
		this.#pressedAt.delete(ev.action.id);
		if (pressedAt !== undefined && Date.now() - pressedAt >= holdToSave) {
			await this.perform(ev.action, async () => {
				await ev.action.setSettings({ ...ev.payload.settings, view: await this.#currentView() });
				if (ev.action.isKey()) {
					await ev.action.showOk();
				}
			});
		} else {
			await this.perform(ev.action, () => this.press(ev.payload.settings));
		}
	}

	override async onSendToPlugin(ev: SendToPluginEvent<JsonValue, CameraPresetSettings>): Promise<void> {
		if ((ev.payload as { event?: unknown } | null)?.event !== "saveView") {
			return super.onSendToPlugin(ev);
		}
		await this.perform(ev.action, async () => {
			const settings = await ev.action.getSettings();
			await ev.action.setSettings({ ...settings, view: await this.#currentView() });
			if (ev.action.isKey()) {
				await ev.action.showOk();
			}
		});
	}

	async #currentView(): Promise<CameraView> {
		const { position, rotation, zoom } = await this.vcam.client.call<CameraView>("camera.get");
		return { position, rotation, zoom };
	}
}
