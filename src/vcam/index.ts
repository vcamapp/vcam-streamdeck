import { VCamClient } from "./client.js";
import { VCamState } from "./state.js";

export class VCam {
	readonly client = new VCamClient();
	readonly state = new VCamState(this.client);
}
