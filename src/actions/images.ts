import fs from "node:fs";

export type KeyStatus = "offline" | "update";

const badges: Record<KeyStatus, string> = {
	offline: `<circle cx="112" cy="32" r="24" fill="#3a3a3c" stroke="#1c1c1e" stroke-width="4"/>
<g fill="none" stroke="#f5f5f7" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
<path d="M107 19v6M117 19v6M103 25h18v6a9 9 0 0 1-18 0zM112 40v6"/>
<path d="M99 45l26-26" stroke="#3a3a3c" stroke-width="8"/>
<path d="M99 45l26-26"/>
</g>`,
	update: `<circle cx="112" cy="32" r="24" fill="#f5a524" stroke="#1c1c1e" stroke-width="4"/>
<g fill="none" stroke="#1c1c1e" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
<path d="M112 44V21M102 30l10-10 10 10"/>
</g>`,
};

/**
 * The key's own image, dimmed, with a badge in the corner, so that the key still tells which action it is while it cannot be used.
 */
export function statusImage(keyImage: string, status: KeyStatus): string {
	// Stream Deck does not draw an <svg> nested in another, so the key image's contents are placed directly.
	const contents = keyImage.replace(/^\s*<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
${contents}
<rect width="144" height="144" fill="#000000" opacity="0.5"/>
${badges[status]}
</svg>`;
	return `data:image/svg+xml;charset=utf8,${encodeURIComponent(svg)}`;
}

/**
 * The image of an action's key as the manifest names it, read from the plugin's files next to `bin/plugin.js`.
 */
export function readKeyImage(actionName: string): string {
	return fs.readFileSync(new URL(`../imgs/actions/${actionName}/key.svg`, import.meta.url), "utf8");
}
