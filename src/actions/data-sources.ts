import { t } from "../i18n.js";
import type { VCam } from "../vcam/index.js";
import type { Avatar, Expression, Motion, ObjectInfo, Scene, Shortcut, TrackingState } from "../vcam/types.js";

export type Item = { label: string; value: string; disabled?: boolean };

/**
 * The choices the property inspector's lists ask for by their `datasource`.
 * They are read from VCam each time, so that what the user just added in VCam is there.
 */
export const dataSources: Record<string, (vcam: VCam) => Promise<Item[]>> = {
	avatars: async ({ client }) =>
		(await client.call<Avatar[]>("avatar.list")).map((avatar) => ({ label: avatar.name, value: avatar.id })),
	scenes: async ({ client }) =>
		(await client.call<Scene[]>("scene.list")).map((scene, index) => ({ label: sceneTitle(scene, index), value: String(scene.id) })),
	expressions: async ({ client }) =>
		(await client.call<Expression[]>("expression.list")).map((expression) => ({ label: expression.name, value: expression.name })),
	motions: async ({ client }) =>
		(await client.call<Motion[]>("motion.list")).map((motion) => ({ label: motion.name, value: motion.id })),
	shortcuts: async ({ client }) =>
		(await client.call<Shortcut[]>("shortcut.list")).map((shortcut) => ({ label: shortcutTitle(shortcut), value: shortcut.id })),
	objects: async ({ client }) =>
		(await client.call<ObjectInfo[]>("object.list")).map((object, _, objects) => ({ label: objectTitle(object, objects), value: String(object.id) })),
	videos: async ({ client }) => {
		const objects = await client.call<ObjectInfo[]>("object.list");
		return objects
			.filter((object) => object.type === "video")
			.map((object) => ({ label: objectTitle(object, objects), value: String(object.id) }));
	},
	trackingSources: async ({ client }) =>
		(await client.call<TrackingState>("tracking.getState")).sources.map((source) => ({ label: trackingSourceName(source.id), value: source.id })),
};

/**
 * VCam shows every unnamed scene as "Scene", so the position tells them apart.
 */
export function sceneTitle(scene: Scene, index: number): string {
	return scene.name === "" ? t("Scene {number}", { number: index + 1 }) : scene.name;
}

const objectTypeNames: Record<string, string> = {
	avatar: "Model",
	image: "Image",
	video: "Video",
	screen: "Screen",
	videoCapture: "Video Capture",
	web: "Web",
	text: "Text",
	wind: "Wind",
};

/**
 * VCam shows an unnamed object by its type, so unnamed objects of the same type are numbered in the order of the list.
 */
export function objectTitle(object: ObjectInfo, objects: readonly ObjectInfo[]): string {
	if (object.name !== "") {
		return object.name;
	}
	const typeName = t(objectTypeNames[object.type] ?? object.type);
	const sameType = objects.filter((other) => other.name === "" && other.type === object.type);
	return sameType.length > 1 ? `${typeName} ${sameType.indexOf(object) + 1}` : typeName;
}

const trackingSourceNames: Record<string, string> = {
	vcamMotion: "VCam Motion",
	iFacialMocap: "iFacialMocap",
	vmcProtocol: "VMC Protocol",
};

export function trackingSourceName(id: string): string {
	return trackingSourceNames[id] ?? id;
}

export function shortcutTitle(shortcut: Shortcut): string {
	return shortcut.title === "" ? t("Untitled") : shortcut.title;
}
