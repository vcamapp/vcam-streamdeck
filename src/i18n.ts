import fs from "node:fs";
import path from "node:path";

let translate = (key: string): string => key;

/**
 * Sets where translations come from. Until then, and for a key with no translation, the English key itself is shown.
 */
export function setTranslator(translator: (key: string) => string): void {
	translate = translator;
}

/**
 * Translates English text, filling `{name}` placeholders with `values`.
 */
export function t(key: string, values: Record<string, string | number> = {}): string {
	return translate(key).replace(/\{(\w+)\}/g, (placeholder, name: string) => String(values[name] ?? placeholder));
}

/**
 * Reads the translations of a language from the `Localization` section of its file in the plugin's folder, as Stream Deck lays them out.
 * The keys are looked up whole: the SDK's own lookup reads them as dotted paths, which English sentences used as keys cannot be.
 */
export function translatorFor(language: string, directory: string): (key: string) => string {
	const file = path.join(directory, `${language.split(/[-_]/)[0]}.json`);
	let translations: Record<string, string> = {};
	try {
		translations = (JSON.parse(fs.readFileSync(file, "utf8")) as { Localization?: Record<string, string> }).Localization ?? {};
	} catch {
		// English and the languages VCam does not support have no file, and show the keys.
	}
	return (key) => translations[key] ?? key;
}
