import { action, type Action, type DialDownEvent, type DialRotateEvent } from "@elgato/streamdeck";

import type { VCam } from "../vcam/index.js";
import { t } from "../i18n.js";
import { TickAccumulator } from "./ticks.js";
import { MissingSettingError, VCamAction } from "./vcam-action.js";

type ExpressionWeightSettings = {
	expressionName?: string;
};

const weightPerTick = 0.05;

/**
 * How long a weight this dial sent wins over the one VCam reports, which may still be from before the call.
 */
const sentWeightLifetime = 500;

@action({ UUID: "com.vcamapp.vcam.expression-weight" })
export class ExpressionWeightAction extends VCamAction<ExpressionWeightSettings> {
	readonly #ticks: TickAccumulator;
	readonly #sent = new Map<string, { weight: number; at: number }>();

	constructor(vcam: VCam) {
		super(vcam);
		this.#ticks = new TickAccumulator(50, (id, ticks) => {
			const action = this.actions.find((action) => action.id === id);
			if (action) {
				void this.perform(action, () => this.#setWeight(action, this.#weight(action) + ticks * weightPerTick));
			}
		});
	}

	protected override async press(): Promise<void> {}

	protected override async render(action: Action<ExpressionWeightSettings>): Promise<void> {
		if (!action.isDial()) {
			return;
		}
		const { expressionName: name } = this.settingsOf(action);
		if (!this.vcam.client.isConnected) {
			await action.setFeedback({ title: name ?? t("Expression"), value: t("Offline"), indicator: 0 });
			return;
		}
		const percent = Math.round(this.#weight(action) * 100);
		await action.setFeedback({ title: name ?? t("Expression"), value: `${percent}%`, indicator: percent });
	}

	override async onDialRotate(ev: DialRotateEvent<ExpressionWeightSettings>): Promise<void> {
		if (!this.vcam.client.isConnected) {
			await ev.action.showAlert();
			return;
		}
		this.#ticks.add(ev.action.id, ev.payload.ticks);
	}

	override async onDialDown(ev: DialDownEvent<ExpressionWeightSettings>): Promise<void> {
		await this.perform(ev.action, () => this.#setWeight(ev.action, this.#weight(ev.action) > 0 ? 0 : 1));
	}

	#weight(action: Action<ExpressionWeightSettings>): number {
		const sent = this.#sent.get(action.id);
		if (sent && Date.now() - sent.at < sentWeightLifetime) {
			return sent.weight;
		}
		const { expressionName: name } = this.settingsOf(action);
		return this.vcam.state.snapshot.expressions.find((expression) => expression.name === name)?.weight ?? 0;
	}

	async #setWeight(action: Action<ExpressionWeightSettings>, value: number): Promise<void> {
		const { expressionName: name } = this.settingsOf(action);
		if (!name) {
			throw new MissingSettingError("expression");
		}
		const weight = Math.round(Math.min(1, Math.max(0, value)) * 100) / 100;
		this.#sent.set(action.id, { weight, at: Date.now() });
		await this.render(action);
		await this.vcam.client.call("expression.set", { expressions: weight > 0 ? [{ name, weight }] : [] });
	}
}
