import WebSocket from "ws";

export type Endpoint = {
	host: string;
	port: number;
	token?: string;
};

export const defaultEndpoint: Endpoint = { host: "127.0.0.1", port: 34965 };

export type VCamEvent = {
	method: string;
	params: Record<string, unknown>;
};

export class VCamError extends Error {
	constructor(
		message: string,
		readonly code: number,
		readonly reason?: string,
	) {
		super(message);
	}
}

export class ConnectionError extends Error {}

export class UnsupportedMethodError extends Error {
	constructor(readonly method: string) {
		super(`This VCam does not offer ${method}. Update VCam to use this action.`);
	}
}

type Pending = {
	resolve: (value: unknown) => void;
	reject: (error: Error) => void;
};

export type ClientOptions = {
	minRetryDelay?: number;
	maxRetryDelay?: number;
};

export class VCamClient {
	readonly #minRetryDelay: number;
	readonly #maxRetryDelay: number;
	readonly #pending = new Map<number, Pending>();
	readonly #eventListeners = new Set<(event: VCamEvent) => void>();
	readonly #connectionListeners = new Set<(connected: boolean) => void>();
	#endpoint?: Endpoint;
	#socket?: WebSocket;
	#methods = new Set<string>();
	#connected = false;
	#nextId = 1;
	#retryDelay: number;
	#retryTimer?: NodeJS.Timeout;

	constructor(options: ClientOptions = {}) {
		this.#minRetryDelay = options.minRetryDelay ?? 1000;
		this.#maxRetryDelay = options.maxRetryDelay ?? 10_000;
		this.#retryDelay = this.#minRetryDelay;
	}

	get isConnected(): boolean {
		return this.#connected;
	}

	supports(method: string): boolean {
		return this.#methods.has(method);
	}

	connect(endpoint: Endpoint): void {
		this.#endpoint = endpoint;
		this.#retryDelay = this.#minRetryDelay;
		this.#open();
	}

	disconnect(): void {
		this.#endpoint = undefined;
		this.#open();
	}

	call<T>(method: string, params?: Record<string, unknown>): Promise<T> {
		if (!this.#connected) {
			return Promise.reject(new ConnectionError("Not connected to VCam."));
		}
		if (!this.supports(method)) {
			return Promise.reject(new UnsupportedMethodError(method));
		}
		return this.#request<T>(method, params);
	}

	onEvent(listener: (event: VCamEvent) => void): () => void {
		this.#eventListeners.add(listener);
		return () => this.#eventListeners.delete(listener);
	}

	onConnectionChange(listener: (connected: boolean) => void): () => void {
		this.#connectionListeners.add(listener);
		return () => this.#connectionListeners.delete(listener);
	}

	#open(): void {
		clearTimeout(this.#retryTimer);
		this.#retryTimer = undefined;
		const previous = this.#socket;
		this.#socket = undefined;
		previous?.terminate();
		this.#closed();

		const endpoint = this.#endpoint;
		if (!endpoint) {
			return;
		}
		const host = endpoint.host.includes(":") ? `[${endpoint.host}]` : endpoint.host;
		const headers: Record<string, string> = endpoint.token ? { Authorization: `Bearer ${endpoint.token}` } : {};
		const socket = new WebSocket(`ws://${host}:${endpoint.port}`, { headers, handshakeTimeout: 5000 });
		this.#socket = socket;

		socket.on("open", () => void this.#handshake(socket));
		socket.on("message", (data, isBinary) => {
			if (!isBinary) {
				this.#receive(data.toString());
			}
		});
		socket.on("error", () => {});
		socket.on("close", () => {
			if (this.#socket !== socket) {
				return;
			}
			this.#socket = undefined;
			this.#closed();
			this.#scheduleRetry();
		});
	}

	async #handshake(socket: WebSocket): Promise<void> {
		try {
			const spec = await this.#request<{ methods?: { name: string }[] }>("rpc.discover");
			await this.#request("events.subscribe");
			if (this.#socket !== socket) {
				return;
			}
			this.#methods = new Set((spec.methods ?? []).map((method) => method.name));
			this.#connected = true;
			this.#retryDelay = this.#minRetryDelay;
			this.#connectionListeners.forEach((listener) => listener(true));
		} catch {
			socket.terminate();
		}
	}

	#closed(): void {
		const error = new ConnectionError("The connection to VCam was lost.");
		this.#pending.forEach((pending) => pending.reject(error));
		this.#pending.clear();
		this.#methods = new Set();
		if (this.#connected) {
			this.#connected = false;
			this.#connectionListeners.forEach((listener) => listener(false));
		}
	}

	#scheduleRetry(): void {
		if (!this.#endpoint) {
			return;
		}
		this.#retryTimer = setTimeout(() => this.#open(), this.#retryDelay);
		this.#retryDelay = Math.min(this.#retryDelay * 2, this.#maxRetryDelay);
	}

	#request<T>(method: string, params?: Record<string, unknown>): Promise<T> {
		const socket = this.#socket;
		if (!socket || socket.readyState !== WebSocket.OPEN) {
			return Promise.reject(new ConnectionError("Not connected to VCam."));
		}
		const id = this.#nextId++;
		return new Promise<T>((resolve, reject) => {
			this.#pending.set(id, { resolve: resolve as (value: unknown) => void, reject });
			socket.send(JSON.stringify({ jsonrpc: "2.0", id, method, ...(params ? { params } : {}) }));
		});
	}

	#receive(text: string): void {
		let message: {
			id?: number;
			method?: string;
			params?: Record<string, unknown>;
			result?: unknown;
			error?: { code: number; message: string; data?: { code?: string } };
		};
		try {
			message = JSON.parse(text);
		} catch {
			return;
		}
		if (typeof message.id === "number") {
			const pending = this.#pending.get(message.id);
			this.#pending.delete(message.id);
			if (message.error) {
				pending?.reject(new VCamError(message.error.message, message.error.code, message.error.data?.code));
			} else {
				pending?.resolve(message.result);
			}
		} else if (typeof message.method === "string") {
			const event = { method: message.method, params: message.params ?? {} };
			this.#eventListeners.forEach((listener) => listener(event));
		}
	}
}
