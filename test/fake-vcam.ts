import { WebSocketServer, type WebSocket } from "ws";

type Handler = (params: Record<string, unknown> | undefined) => unknown;

/**
 * A WebSocket server that answers like VCam with the handlers given, and records what it was asked.
 */
export class FakeVCam {
	readonly server: WebSocketServer;
	readonly calls: { method: string; params?: Record<string, unknown> }[] = [];
	readonly headers: Record<string, string | string[] | undefined>[] = [];
	#sockets = new Set<WebSocket>();

	constructor(handlers: Record<string, Handler>, port = 0) {
		this.server = new WebSocketServer({ port, host: "127.0.0.1" });
		this.server.on("connection", (socket, request) => {
			this.headers.push(request.headers);
			this.#sockets.add(socket);
			socket.on("close", () => this.#sockets.delete(socket));
			socket.on("message", (data) => {
				const { id, method, params } = JSON.parse(data.toString());
				this.calls.push({ method, params });
				const all: Record<string, Handler> = {
					"rpc.discover": () => ({ methods: Object.keys(handlers).map((name) => ({ name })) }),
					"events.subscribe": () => true,
					...handlers,
				};
				const handler = all[method];
				if (!handler) {
					socket.send(JSON.stringify({ jsonrpc: "2.0", id, error: { code: -32601, message: "Method not found" } }));
					return;
				}
				try {
					const result = handler(params);
					if (result !== undefined) {
						socket.send(JSON.stringify({ jsonrpc: "2.0", id, result }));
					}
				} catch (error) {
					socket.send(JSON.stringify({ jsonrpc: "2.0", id, error: error as object }));
				}
			});
		});
	}

	listening(): Promise<void> {
		return new Promise((resolve) => this.server.once("listening", () => resolve()));
	}

	get port(): number {
		return (this.server.address() as { port: number }).port;
	}

	send(method: string, params: Record<string, unknown>): void {
		this.#sockets.forEach((socket) => socket.send(JSON.stringify({ jsonrpc: "2.0", method, params })));
	}

	dropConnections(): void {
		this.#sockets.forEach((socket) => socket.terminate());
	}

	close(): Promise<void> {
		this.dropConnections();
		return new Promise((resolve) => this.server.close(() => resolve()));
	}
}

export function waitFor(condition: () => boolean, timeout = 2000): Promise<void> {
	const start = Date.now();
	return new Promise((resolve, reject) => {
		const check = () => {
			if (condition()) {
				resolve();
			} else if (Date.now() - start > timeout) {
				reject(new Error("Timed out"));
			} else {
				setTimeout(check, 5);
			}
		};
		check();
	});
}
