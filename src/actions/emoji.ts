import { action } from "@elgato/streamdeck";

import { MissingSettingError, VCamAction, type Look } from "./vcam-action.js";

type EmojiSettings = {
	emoji?: string;
};

@action({ UUID: "com.vcamapp.vcam.emoji" })
export class EmojiAction extends VCamAction<EmojiSettings> {
	protected override async press({ emoji }: EmojiSettings): Promise<void> {
		if (!emoji) {
			throw new MissingSettingError("emoji");
		}
		await this.vcam.client.call("emoji.show", { emoji });
	}

	protected override look({ emoji }: EmojiSettings): Look {
		return { title: emoji };
	}
}
