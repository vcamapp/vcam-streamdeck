import { defaultEndpoint, type Endpoint } from "./vcam/client.js";

export type ConnectionSettings = {
	host?: string;
	port?: string;
	token?: string;
};

export function endpointFrom(settings: ConnectionSettings): Endpoint {
	const host = settings.host?.trim() || defaultEndpoint.host;
	const port = Number(settings.port);
	const token = settings.token?.trim();
	return {
		host,
		port: Number.isInteger(port) && port > 0 && port < 65536 ? port : defaultEndpoint.port,
		...(token ? { token } : {}),
	};
}
