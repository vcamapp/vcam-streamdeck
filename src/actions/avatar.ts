import { action } from "@elgato/streamdeck";

import type { Snapshot } from "../vcam/state.js";
import { MissingSettingError, VCamAction, type Look } from "./vcam-action.js";

type AvatarSettings = {
	avatarId?: string;
};

@action({ UUID: "com.vcamapp.vcam.avatar" })
export class AvatarAction extends VCamAction<AvatarSettings> {
	protected override async press({ avatarId }: AvatarSettings): Promise<void> {
		if (!avatarId) {
			throw new MissingSettingError("avatar");
		}
		// Loading takes seconds and resets the avatar, so the avatar on screen is left as it is.
		if (this.vcam.state.snapshot.avatarId === avatarId) {
			return;
		}
		await this.vcam.client.call("avatar.load", { avatarId });
	}

	protected override look({ avatarId }: AvatarSettings, snapshot: Snapshot): Look {
		return {
			on: avatarId !== undefined && snapshot.avatarId === avatarId,
			title: snapshot.avatars.find((avatar) => avatar.id === avatarId)?.name,
		};
	}
}
