import { afterEach, describe, expect, it } from "vitest";

import { ConnectionError, UnsupportedMethodError, VCamClient, VCamError, type VCamEvent } from "../src/vcam/client.js";
import { FakeVCam, waitFor } from "./fake-vcam.js";

describe("VCamClient", () => {
	let fake: FakeVCam | undefined;
	let client: VCamClient | undefined;

	afterEach(async () => {
		client?.disconnect();
		await fake?.close();
	});

	async function connect(handlers: ConstructorParameters<typeof FakeVCam>[0], token?: string) {
		fake = new FakeVCam(handlers);
		await fake.listening();
		client = new VCamClient({ minRetryDelay: 10, maxRetryDelay: 20 });
		client.connect({ host: "127.0.0.1", port: fake.port, token });
		return { fake, client };
	}

	it("subscribes to events and learns the methods before it counts as connected", async () => {
		const { fake, client } = await connect({ "scene.list": () => [] });
		await waitFor(() => client.isConnected);
		expect(fake.calls.map((call) => call.method)).toEqual(["rpc.discover", "events.subscribe"]);
		expect(client.supports("scene.list")).toBe(true);
		expect(client.supports("shortcut.run")).toBe(false);
	});

	it("sends the token as a bearer header and no origin", async () => {
		const { fake, client } = await connect({}, "secret");
		await waitFor(() => client.isConnected);
		expect(fake.headers[0]?.authorization).toBe("Bearer secret");
		expect(fake.headers[0]?.origin).toBeUndefined();
	});

	it("returns results and VCam's errors", async () => {
		const { client } = await connect({
			"scene.load": (params) => {
				if (params?.sceneId === 9) {
					throw { code: 1004, message: "Scene was not found.", data: { code: "scene_not_found" } };
				}
				return true;
			},
		});
		await waitFor(() => client.isConnected);
		await expect(client.call("scene.load", { sceneId: 1 })).resolves.toBe(true);
		const error = await client.call("scene.load", { sceneId: 9 }).catch((error) => error);
		expect(error).toBeInstanceOf(VCamError);
		expect(error).toMatchObject({ code: 1004, reason: "scene_not_found" });
	});

	it("refuses methods this VCam does not offer without sending them", async () => {
		const { fake, client } = await connect({});
		await waitFor(() => client.isConnected);
		await expect(client.call("shortcut.run", { shortcutId: "x" })).rejects.toBeInstanceOf(UnsupportedMethodError);
		expect(fake.calls.some((call) => call.method === "shortcut.run")).toBe(false);
	});

	it("passes events on", async () => {
		const { fake, client } = await connect({});
		const events: VCamEvent[] = [];
		client.onEvent((event) => events.push(event));
		await waitFor(() => client.isConnected);
		fake.send("scene.loaded", { sceneId: 3 });
		await waitFor(() => events.length === 1);
		expect(events[0]).toEqual({ method: "scene.loaded", params: { sceneId: 3 } });
	});

	it("fails calls waiting for an answer when the connection drops, and connects again", async () => {
		const { fake, client } = await connect({ "shortcut.run": () => undefined });
		const changes: boolean[] = [];
		client.onConnectionChange((connected) => changes.push(connected));
		await waitFor(() => client.isConnected);

		const waiting = client.call("shortcut.run", { shortcutId: "x" });
		await waitFor(() => fake.calls.some((call) => call.method === "shortcut.run"));
		fake.dropConnections();
		await expect(waiting).rejects.toBeInstanceOf(ConnectionError);

		await waitFor(() => changes.length === 2);
		expect(changes).toEqual([true, false]);
		await waitFor(() => client.isConnected);
		expect(changes).toEqual([true, false, true]);
	});

	it("keeps trying until VCam starts", async () => {
		const probe = new FakeVCam({});
		await probe.listening();
		const port = probe.port;
		await probe.close();

		client = new VCamClient({ minRetryDelay: 10, maxRetryDelay: 20 });
		client.connect({ host: "127.0.0.1", port });
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(client.isConnected).toBe(false);

		fake = new FakeVCam({}, port);
		await waitFor(() => client!.isConnected);
	});
});
