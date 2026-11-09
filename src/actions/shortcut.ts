import { action } from "@elgato/streamdeck";

import type { Snapshot } from "../vcam/state.js";
import { shortcutTitle } from "./data-sources.js";
import { MissingSettingError, VCamAction, type Look } from "./vcam-action.js";

type ShortcutSettings = {
	shortcutId?: string;
};

@action({ UUID: "com.vcamapp.vcam.shortcut" })
export class ShortcutAction extends VCamAction<ShortcutSettings> {
	protected override readonly requirement = { since: "0.1.1", methods: ["shortcut.list", "shortcut.run"] };

	protected override async press({ shortcutId }: ShortcutSettings): Promise<void> {
		if (!shortcutId) {
			throw new MissingSettingError("shortcut");
		}
		// VCam rejects a shortcut that is already running, so the press is not an error to show.
		if (this.vcam.state.snapshot.runningShortcutIds.has(shortcutId)) {
			return;
		}
		await this.vcam.client.call("shortcut.run", { shortcutId });
	}

	protected override look({ shortcutId }: ShortcutSettings, snapshot: Snapshot): Look {
		const shortcut = snapshot.shortcuts.find((shortcut) => shortcut.id === shortcutId);
		return {
			on: shortcutId !== undefined && snapshot.runningShortcutIds.has(shortcutId),
			title: shortcut && shortcutTitle(shortcut),
		};
	}
}
