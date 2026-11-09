import { action } from "@elgato/streamdeck";

import type { Snapshot } from "../vcam/state.js";
import { trackingSourceName } from "./data-sources.js";
import { VCamAction, type Look } from "./vcam-action.js";

type TrackingStatusSettings = {
	sourceId?: string;
};

/**
 * Shows whether an app or device sending tracking is connected. Pressing it does nothing.
 */
@action({ UUID: "com.vcamapp.vcam.tracking-status" })
export class TrackingStatusAction extends VCamAction<TrackingStatusSettings> {
	protected override async press(): Promise<void> {}

	protected override look({ sourceId }: TrackingStatusSettings, snapshot: Snapshot): Look {
		return {
			on: sourceId !== undefined && snapshot.tracking[sourceId] === "connected",
			// The names do not fit on one line of a key.
			title: sourceId && trackingSourceName(sourceId).replace(" ", "\n"),
		};
	}
}
