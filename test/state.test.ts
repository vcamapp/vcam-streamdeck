import { afterEach, describe, expect, it } from "vitest";

import { VCamClient } from "../src/vcam/client.js";
import { VCamState } from "../src/vcam/state.js";
import { FakeVCam, waitFor } from "./fake-vcam.js";

describe("VCamState", () => {
	let fake: FakeVCam | undefined;
	let client: VCamClient | undefined;

	afterEach(async () => {
		client?.disconnect();
		await fake?.close();
	});

	async function connect(handlers: ConstructorParameters<typeof FakeVCam>[0]) {
		fake = new FakeVCam(handlers);
		await fake.listening();
		client = new VCamClient({ minRetryDelay: 10, maxRetryDelay: 20 });
		const state = new VCamState(client);
		client.connect({ host: "127.0.0.1", port: fake.port });
		return { fake, client, state };
	}

	const handlers = {
		"app.getInfo": () => ({ apiVersion: "0.1.0", appVersion: "0.3.0", capabilities: [] }),
		"scene.get": () => ({ id: 2, name: "Talk" }),
		"scene.list": () => [{ id: 1, name: "Opening" }, { id: 2, name: "Talk" }],
		"state.get": () => ({ avatarId: "A", playingMotionIds: ["builtin:wave"], subtitle: "Hi", expressions: [{ name: "happy", weight: 1 }] }),
		"avatar.list": () => [{ id: "A", name: "Alice" }, { id: "B", name: "Bob" }],
		"tracking.getState": () => ({ sources: [{ id: "vcamMotion", status: "connecting" }, { id: "vmcProtocol", status: "connected" }] }),
		"recording.getState": () => ({ status: "recording", duration: 5 }),
		"motion.list": () => [{ id: "builtin:wave", name: "Wave", isLoop: false }],
		"shortcut.list": () => [{ id: "a", title: "Intro" }],
		"object.list": () => [{ id: 7, type: "text", name: "Title", isHidden: false }],
	};

	it("reads what VCam is doing on connecting", async () => {
		const { state } = await connect(handlers);
		await waitFor(() => state.snapshot.sceneId !== undefined);
		const snapshot = state.snapshot;
		expect(snapshot.apiVersion).toBe("0.1.0");
		expect(snapshot.sceneId).toBe(2);
		expect([...snapshot.playingMotionIds]).toEqual(["builtin:wave"]);
		expect(snapshot.subtitle).toBe("Hi");
		expect(snapshot.expressions).toEqual([{ name: "happy", weight: 1 }]);
		expect(snapshot.recording).toBe("recording");
		expect(Date.now() - snapshot.recordingStartedAt!).toBeGreaterThanOrEqual(5000);
		expect(snapshot.scenes).toHaveLength(2);
		expect(snapshot.shortcuts).toEqual([{ id: "a", title: "Intro" }]);
		expect(snapshot.objects[0]?.name).toBe("Title");
		expect(snapshot.avatarId).toBe("A");
		expect(snapshot.avatars).toHaveLength(2);
		expect(snapshot.tracking).toEqual({ vcamMotion: "connecting", vmcProtocol: "connected" });
	});

	it("follows the avatar and the tracking sources", async () => {
		let vmc = "connected";
		const { fake, state } = await connect({
			...handlers,
			"tracking.getState": () => ({ sources: [{ id: "vcamMotion", status: "connecting" }, { id: "vmcProtocol", status: vmc }] }),
		});
		await waitFor(() => state.snapshot.avatarId === "A");

		fake.send("avatar.loaded", { avatarId: "B" });
		await waitFor(() => state.snapshot.avatarId === "B");
		fake.send("avatar.loaded", {});
		await waitFor(() => state.snapshot.avatarId === undefined);

		fake.send("tracking.connected", { sourceId: "vcamMotion" });
		await waitFor(() => state.snapshot.tracking.vcamMotion === "connected");
		vmc = "connecting";
		fake.send("tracking.disconnected", { sourceId: "vmcProtocol" });
		await waitFor(() => state.snapshot.tracking.vmcProtocol === "connecting");
	});

	it("reads only what this VCam offers", async () => {
		const { state } = await connect({ "scene.get": () => ({ id: 1, name: "Opening" }) });
		await waitFor(() => state.snapshot.sceneId === 1);
		expect(state.snapshot.recording).toBe("idle");
		expect(state.snapshot.shortcuts).toEqual([]);
	});

	it("follows events", async () => {
		const { fake, state } = await connect(handlers);
		await waitFor(() => state.snapshot.sceneId === 2);

		fake.send("motion.stopped", { motionId: "builtin:wave" });
		fake.send("shortcut.started", { shortcutId: "a" });
		fake.send("expression.changed", { expressions: [] });
		fake.send("recording.stopped", {});
		fake.send("subtitle.changed", { text: "" });
		fake.send("scene.loaded", { sceneId: 1 });
		await waitFor(() => state.snapshot.sceneId === 1);

		const snapshot = state.snapshot;
		expect(snapshot.playingMotionIds.size).toBe(0);
		expect(snapshot.runningShortcutIds.has("a")).toBe(true);
		expect(snapshot.expressions).toEqual([]);
		expect(snapshot.recording).toBe("idle");
		expect(snapshot.recordingStartedAt).toBeUndefined();
		expect(snapshot.subtitle).toBe("");

		fake.send("shortcut.finished", { shortcutId: "a" });
		await waitFor(() => !state.snapshot.runningShortcutIds.has("a"));
	});

	it("reads the objects again when they change", async () => {
		let hidden = false;
		const { fake, state } = await connect({
			...handlers,
			"object.list": () => [{ id: 7, type: "text", name: "Title", isHidden: hidden }],
		});
		await waitFor(() => state.snapshot.objects.length === 1);
		hidden = true;
		fake.send("objects.changed", { added: [], changed: [7], removed: [] });
		await waitFor(() => state.snapshot.objects[0]?.isHidden === true);
	});

	it("forgets everything when the connection drops", async () => {
		const { fake, client, state } = await connect(handlers);
		await waitFor(() => state.snapshot.sceneId === 2);
		fake.dropConnections();
		await waitFor(() => !client.isConnected);
		expect(state.snapshot.sceneId).toBeUndefined();
		expect(state.snapshot.playingMotionIds.size).toBe(0);
	});
});
