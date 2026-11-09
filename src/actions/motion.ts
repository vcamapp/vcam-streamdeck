import { action } from "@elgato/streamdeck";

import type { Snapshot } from "../vcam/state.js";
import { MissingSettingError, VCamAction, type Look } from "./vcam-action.js";

type MotionSettings = {
	motionId?: string;
};

@action({ UUID: "com.vcamapp.vcam.motion" })
export class MotionAction extends VCamAction<MotionSettings> {
	protected override async press({ motionId }: MotionSettings): Promise<void> {
		if (!motionId) {
			throw new MissingSettingError("motion");
		}
		const playing = this.vcam.state.snapshot.playingMotionIds.has(motionId);
		await this.vcam.client.call(playing ? "motion.stop" : "motion.play", { motionId });
	}

	protected override look({ motionId }: MotionSettings, snapshot: Snapshot): Look {
		return {
			on: motionId !== undefined && snapshot.playingMotionIds.has(motionId),
			title: snapshot.motions.find((motion) => motion.id === motionId)?.name,
		};
	}
}
