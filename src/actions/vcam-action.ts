import streamDeck, {
	SingletonAction,
	type Action,
	type DidReceiveSettingsEvent,
	type KeyDownEvent,
	type PropertyInspectorDidAppearEvent,
	type SendToPluginEvent,
	type TitleParametersDidChangeEvent,
	type WillAppearEvent,
	type WillDisappearEvent,
} from "@elgato/streamdeck";
import type { JsonObject, JsonValue } from "@elgato/utils";

import { t } from "../i18n.js";
import { UnsupportedMethodError } from "../vcam/client.js";
import type { VCam } from "../vcam/index.js";
import type { Snapshot } from "../vcam/state.js";
import { dataSources, type Item } from "./data-sources.js";
import { readKeyImage, statusImage, type KeyStatus } from "./images.js";

export type Settings = JsonObject;

/**
 * The name a key last showed, kept in its settings so that the key still shows it while VCam is not connected.
 */
type KnownTitle = { knownTitle?: string };

/**
 * How a key looks: `on` picks the second state of a key that has two, and `title` replaces the key's title unless the user wrote their own.
 */
export type Look = { on?: boolean; title?: string };

export class MissingSettingError extends Error {
	constructor(setting: string) {
		super(`Choose the ${setting} in the action's settings.`);
	}
}

/**
 * The VCam API version that first offered the methods an action calls. VCam's own specification cannot tell, since an older VCam does not list what came later.
 */
export type Requirement = { since: string; methods: readonly string[] };

type Availability = "offline" | "update" | "ready";

type Shown = { availability: Availability; on?: boolean; title?: string };

export abstract class VCamAction<T extends Settings> extends SingletonAction<T> {
	protected readonly vcam: VCam;
	readonly #settings = new Map<string, T>();
	readonly #shown = new Map<string, Shown>();
	readonly #customTitles = new Set<string>();
	readonly #statusImages = new Map<KeyStatus, string>();
	#notice?: string;
	protected readonly requirement?: Requirement;

	constructor(vcam: VCam) {
		super();
		this.vcam = vcam;
		vcam.state.onChange(() => this.refresh());
	}

	protected abstract press(settings: T): Promise<void>;

	protected look(_settings: T, _snapshot: Snapshot): Look {
		return {};
	}

	protected settingsOf(action: Action<T>): T {
		return this.#settings.get(action.id) ?? ({} as T);
	}

	refresh(): void {
		for (const action of this.actions) {
			void this.render(action);
		}
		if (streamDeck.ui.action?.manifestId === this.manifestId) {
			void this.#sendNotice();
		}
	}

	#statusImage(status: KeyStatus): string {
		let image = this.#statusImages.get(status);
		if (!image) {
			const name = this.manifestId?.split(".").pop() ?? "";
			image = statusImage(readKeyImage(name), status);
			this.#statusImages.set(status, image);
		}
		return image;
	}

	#availability(): Availability {
		const { client } = this.vcam;
		if (!client.isConnected) {
			return "offline";
		}
		return this.requirement?.methods.every((method) => client.supports(method)) === false ? "update" : "ready";
	}

	/**
	 * Why the action cannot be used now, shown at the top of the property inspector.
	 */
	#noticeText(): string {
		switch (this.#availability()) {
			case "offline":
				return t("VCam is not connected. Start VCam, turn on the VCam API in Settings > Integration, and check Connection below.");
			case "update": {
				const since = this.requirement?.since ?? "";
				const current = this.vcam.state.snapshot.apiVersion;
				return current
					? t("This action needs VCam API {since} or later, and the connected VCam has API {current}. Update VCam to use it.", { since, current })
					: t("This action needs VCam API {since} or later, and the connected VCam is older. Update VCam to use it.", { since });
			}
			case "ready":
				return "";
		}
	}

	async #sendNotice(force = false): Promise<void> {
		const notice = this.#noticeText();
		if (!force && notice === this.#notice) {
			return;
		}
		this.#notice = notice;
		await streamDeck.ui.sendToPropertyInspector({ event: "notice", message: notice });
	}

	override async onPropertyInspectorDidAppear(_ev: PropertyInspectorDidAppearEvent<T>): Promise<void> {
		await this.#sendNotice(true);
	}

	protected async render(action: Action<T>): Promise<void> {
		if (!action.isKey()) {
			return;
		}
		const availability = this.#availability();
		const shown = this.#shown.get(action.id);
		const settings = this.settingsOf(action);
		const { knownTitle } = settings as KnownTitle;
		const look = availability === "ready" ? this.look(settings, this.vcam.state.snapshot) : {};
		const title = availability === "ready" ? look.title : (shown?.title ?? knownTitle);
		const next: Shown = { availability, on: look.on, title };
		this.#shown.set(action.id, next);

		if (shown?.availability !== availability) {
			await action.setImage(availability === "ready" ? undefined : this.#statusImage(availability));
		}
		if (availability === "ready" && look.title !== undefined && look.title !== knownTitle) {
			const updated = { ...settings, knownTitle: look.title };
			this.#settings.set(action.id, updated);
			await action.setSettings(updated);
		}
		if (look.on !== undefined && shown?.on !== look.on) {
			await action.setState(look.on ? 1 : 0);
		}
		if (!this.#customTitles.has(action.id) && shown?.title !== next.title) {
			await action.setTitle(next.title);
		}
	}

	override async onWillAppear(ev: WillAppearEvent<T>): Promise<void> {
		this.#settings.set(ev.action.id, ev.payload.settings);
		this.#shown.delete(ev.action.id);
		await this.render(ev.action);
	}

	override onWillDisappear(ev: WillDisappearEvent<T>): void {
		this.#settings.delete(ev.action.id);
		this.#shown.delete(ev.action.id);
	}

	override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<T>): Promise<void> {
		this.#settings.set(ev.action.id, ev.payload.settings);
		await this.render(ev.action);
	}

	override async onTitleParametersDidChange(ev: TitleParametersDidChangeEvent<T>): Promise<void> {
		const { title } = ev.payload;
		if (title !== "" && title !== this.#shown.get(ev.action.id)?.title) {
			this.#customTitles.add(ev.action.id);
		} else if (this.#customTitles.delete(ev.action.id)) {
			this.#shown.delete(ev.action.id);
			await this.render(ev.action);
		}
	}

	override async onKeyDown(ev: KeyDownEvent<T>): Promise<void> {
		await this.perform(ev.action, () => this.press(ev.payload.settings));
	}

	protected async perform(action: Action<T>, work: () => Promise<unknown>): Promise<void> {
		const availability = this.#availability();
		if (availability !== "ready") {
			streamDeck.logger.warn(`${this.manifestId}: ${this.#noticeText()}`);
			await showAlert(action);
			return;
		}
		try {
			await work();
		} catch (error) {
			streamDeck.logger.warn(`${this.manifestId}: ${error instanceof Error ? error.message : String(error)}`);
			await showAlert(action);
		}
	}

	override async onSendToPlugin(ev: SendToPluginEvent<JsonValue, T>): Promise<void> {
		const event = (ev.payload as { event?: unknown } | null)?.event;
		if (typeof event !== "string" || !(event in dataSources)) {
			return;
		}
		await streamDeck.ui.sendToPropertyInspector({ event, items: await this.#items(dataSources[event]) });
	}

	async #items(source: (vcam: VCam) => Promise<Item[]>): Promise<Item[]> {
		if (!this.vcam.client.isConnected) {
			return [{ label: t("VCam is not connected"), value: "", disabled: true }];
		}
		try {
			return await source(this.vcam);
		} catch (error) {
			const label = error instanceof UnsupportedMethodError ? t("Update VCam to use this action") : t("Could not read from VCam");
			return [{ label, value: "", disabled: true }];
		}
	}
}

async function showAlert(action: Action<Settings>): Promise<void> {
	if (action.isKey() || action.isDial()) {
		await action.showAlert();
	}
}
