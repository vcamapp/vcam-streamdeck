import { afterEach, describe, expect, it } from "vitest";

import path from "node:path";

import { setTranslator, t, translatorFor } from "../src/i18n.js";

describe("t", () => {
	afterEach(() => setTranslator((key) => key));

	it("shows the English key until a translator is set", () => {
		expect(t("Scene {number}", { number: 2 })).toBe("Scene 2");
	});

	it("fills the placeholders of the translation", () => {
		setTranslator((key) => (key === "Scene {number}" ? "シーン {number}" : key));
		expect(t("Scene {number}", { number: 2 })).toBe("シーン 2");
	});

	it("leaves a placeholder without a value as it is", () => {
		expect(t("Needs {since}")).toBe("Needs {since}");
	});

	it("reads whole sentences as keys from the plugin's language file", () => {
		setTranslator(translatorFor("ja", path.join(import.meta.dirname, "..", "com.vcamapp.vcam.sdPlugin")));
		expect(t("VCam is not connected. Start VCam, turn on the VCam API in Settings > Integration, and check Connection below.")).toMatch(/^VCamに接続していません。/);
		expect(t("Scene {number}", { number: 1 })).toBe("シーン 1");
	});

	it("shows English for a language VCam does not support", () => {
		setTranslator(translatorFor("de", path.join(import.meta.dirname, "..", "com.vcamapp.vcam.sdPlugin")));
		expect(t("Untitled")).toBe("Untitled");
	});
});
