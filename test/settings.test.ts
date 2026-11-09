import { describe, expect, it } from "vitest";

import { objectTitle, sceneTitle, trackingSourceName } from "../src/actions/data-sources.js";
import { fade } from "../src/actions/fade.js";
import { elapsed } from "../src/actions/elapsed.js";
import { endpointFrom } from "../src/connection-settings.js";

describe("endpointFrom", () => {
	it("uses this computer and VCam's default port when nothing is set", () => {
		expect(endpointFrom({})).toEqual({ host: "127.0.0.1", port: 34965 });
	});

	it("reads the host, port and token the user entered", () => {
		expect(endpointFrom({ host: " 192.168.1.5 ", port: "40000", token: " abc " })).toEqual({
			host: "192.168.1.5",
			port: 40000,
			token: "abc",
		});
	});

	it("falls back to the default port for a port that cannot be used", () => {
		expect(endpointFrom({ port: "70000" }).port).toBe(34965);
		expect(endpointFrom({ port: "abc" }).port).toBe(34965);
	});
});

describe("fade", () => {
	it("leaves the duration out for none", () => {
		expect(fade(undefined)).toEqual({});
		expect(fade(0)).toEqual({});
		expect(fade("0.5")).toEqual({ duration: 0.5 });
	});
});

describe("elapsed", () => {
	it("shows minutes and seconds, and hours once there are some", () => {
		expect(elapsed(0)).toBe("0:00");
		expect(elapsed(75_000)).toBe("1:15");
		expect(elapsed(3_725_000)).toBe("1:02:05");
	});
});

describe("sceneTitle", () => {
	it("names an unnamed scene by its position", () => {
		expect(sceneTitle({ id: 5, name: "" }, 1)).toBe("Scene 2");
		expect(sceneTitle({ id: 5, name: "Talk" }, 1)).toBe("Talk");
	});
});

describe("objectTitle", () => {
	it("names unnamed objects by their type, numbered when the type repeats", () => {
		const image = (id: number) => ({ id, type: "image", name: "", isHidden: false });
		const avatar = { id: -1, type: "avatar", name: "", isHidden: false };
		const titled = { id: 9, type: "image", name: "Logo", isHidden: false };
		const objects = [image(1), titled, image(2), avatar];
		expect(objects.map((object) => objectTitle(object, objects))).toEqual(["Image 1", "Logo", "Image 2", "Model"]);
	});
});

describe("trackingSourceName", () => {
	it("names the sources VCam reports, and passes others through", () => {
		expect(trackingSourceName("vmcProtocol")).toBe("VMC Protocol");
		expect(trackingSourceName("newSource")).toBe("newSource");
	});
});
