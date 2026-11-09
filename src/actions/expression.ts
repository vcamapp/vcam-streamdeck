import { action } from "@elgato/streamdeck";

import type { Snapshot } from "../vcam/state.js";
import { fade } from "./fade.js";
import { MissingSettingError, VCamAction, type Look } from "./vcam-action.js";

type ExpressionSettings = {
	expressionName?: string;
	weight?: number;
	duration?: number;
};

/**
 * Wears one expression, or takes it off when it is on. VCam takes the whole face in one call, so the other expressions come off too.
 */
@action({ UUID: "com.vcamapp.vcam.expression" })
export class ExpressionAction extends VCamAction<ExpressionSettings> {
	protected override async press(settings: ExpressionSettings): Promise<void> {
		const { expressionName: name, weight, duration } = settings;
		if (!name) {
			throw new MissingSettingError("expression");
		}
		const expressions = isWorn(name, this.vcam.state.snapshot) ? [] : [{ name, weight: weight === undefined ? 1 : Number(weight) }];
		await this.vcam.client.call("expression.set", { expressions, ...fade(duration) });
	}

	protected override look({ expressionName: name }: ExpressionSettings, snapshot: Snapshot): Look {
		return { on: name !== undefined && isWorn(name, snapshot), title: name };
	}
}

function isWorn(name: string, snapshot: Snapshot): boolean {
	return snapshot.expressions.some((expression) => expression.name === name && expression.weight > 0);
}
