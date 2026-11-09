import streamDeck from "@elgato/streamdeck";

import { AvatarAction } from "./actions/avatar.js";
import { BackgroundColorAction } from "./actions/background-color.js";
import { CameraPresetAction } from "./actions/camera-preset.js";
import { CameraResetAction } from "./actions/camera-reset.js";
import { CameraZoomAction } from "./actions/camera-zoom.js";
import { EmojiAction } from "./actions/emoji.js";
import { ExpressionWeightAction } from "./actions/expression-weight.js";
import { ExpressionAction } from "./actions/expression.js";
import { MotionAction } from "./actions/motion.js";
import { ObjectVisibilityAction } from "./actions/object-visibility.js";
import { RecordingAction } from "./actions/recording.js";
import { SceneAction } from "./actions/scene.js";
import { ShortcutAction } from "./actions/shortcut.js";
import { SubtitleAction } from "./actions/subtitle.js";
import { TrackingStatusAction } from "./actions/tracking-status.js";
import { VideoAction } from "./actions/video.js";
import { endpointFrom, type ConnectionSettings } from "./connection-settings.js";
import { setTranslator, translatorFor } from "./i18n.js";
import { VCam } from "./vcam/index.js";

streamDeck.logger.setLevel("info");
setTranslator(translatorFor(streamDeck.info.application.language, process.cwd()));

const vcam = new VCam();
const actions = [
	new SceneAction(vcam),
	new AvatarAction(vcam),
	new ExpressionAction(vcam),
	new MotionAction(vcam),
	new ShortcutAction(vcam),
	new RecordingAction(vcam),
	new EmojiAction(vcam),
	new SubtitleAction(vcam),
	new ObjectVisibilityAction(vcam),
	new VideoAction(vcam),
	new CameraPresetAction(vcam),
	new CameraResetAction(vcam),
	new BackgroundColorAction(vcam),
	new TrackingStatusAction(vcam),
	new CameraZoomAction(vcam),
	new ExpressionWeightAction(vcam),
];
actions.forEach((action) => streamDeck.actions.registerAction(action));

vcam.client.onConnectionChange((connected) => {
	streamDeck.logger.info(connected ? "Connected to VCam" : "Disconnected from VCam");
	actions.forEach((action) => action.refresh());
});

let endpointKey = "";
function connect(settings: ConnectionSettings): void {
	const endpoint = endpointFrom(settings);
	const key = JSON.stringify(endpoint);
	if (key !== endpointKey) {
		endpointKey = key;
		vcam.client.connect(endpoint);
	}
}

streamDeck.settings.onDidReceiveGlobalSettings<ConnectionSettings>((ev) => connect(ev.settings));

await streamDeck.connect();
connect(await streamDeck.settings.getGlobalSettings<ConnectionSettings>());
