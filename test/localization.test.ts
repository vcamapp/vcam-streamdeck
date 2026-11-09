import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

const plugin = "com.vcamapp.vcam.sdPlugin";
const languages = ["ja", "ko"];

function read(file: string): string {
	return fs.readFileSync(path.join(import.meta.dirname, "..", file), "utf8");
}

function sourceFiles(directory: string): string[] {
	return fs
		.readdirSync(path.join(import.meta.dirname, "..", directory), { recursive: true, encoding: "utf8" })
		.filter((file) => file.endsWith(".ts"))
		.map((file) => path.join(directory, file));
}

describe("plugin translations", () => {
	const keys = new Set(sourceFiles("src").flatMap((file) => [...read(file).matchAll(/\bt\("([^"]+)"/g)].map((match) => match[1]!)));
	const objectTypes = read("src/actions/data-sources.ts").match(/const objectTypeNames[^}]*\}/)![0];
	[...objectTypes.matchAll(/: "([^"]+)"/g)].forEach((match) => keys.add(match[1]!));

	it.each(languages)("has every string the plugin shows in %s", (language) => {
		const { Localization } = JSON.parse(read(`${plugin}/${language}.json`)) as { Localization: Record<string, string> };
		expect([...keys].filter((key) => !(key in Localization))).toEqual([]);
	});

	it.each(languages)("names and explains every action in %s", (language) => {
		const translations = JSON.parse(read(`${plugin}/${language}.json`)) as Record<string, { Name?: string; Tooltip?: string }>;
		const { Actions } = JSON.parse(read(`${plugin}/manifest.json`)) as { Actions: { UUID: string }[] };
		const missing = Actions.filter(({ UUID }) => !translations[UUID]?.Name || !translations[UUID]?.Tooltip);
		expect(missing.map(({ UUID }) => UUID)).toEqual([]);
	});
});

describe("property inspector translations", () => {
	const window: { vcamLocales?: Record<string, Record<string, string>> } = {};
	vm.runInNewContext(read(`${plugin}/ui/locales.js`), { window });
	const locales = window.vcamLocales!;
	const keys = [...read(`${plugin}/ui/inspector.html`).matchAll(/data-i18n(?:-label|-placeholder)?="([^"]+)"/g)].map((match) => match[1]!);

	it.each(["en", ...languages])("has every string the page shows in %s", (language) => {
		expect(keys.filter((key) => !locales[language]?.[key])).toEqual([]);
	});
});
