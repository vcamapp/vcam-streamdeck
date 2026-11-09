# VCam for Stream Deck

Control [VCam](https://vcamapp.com/en/) from Stream Deck through the VCam API, and see on the keys what VCam is doing.

> [!NOTE]
> The VCam API is currently available only in [VCamNova](https://vcamapp.com/en/vcamnova), the next version of VCam in development. The released VCam does not offer it yet. With it, assign a shortcut key in VCam and send it with Stream Deck's Hotkey action.

## What it does

- **Switches what you show without bringing VCam to the front.** Scenes, avatars, expressions, motions, your VCam shortcuts, subtitles, objects, videos, emoji, camera views, the background color, and recording.
- **Shows VCam's state on the keys.** The key of the scene or avatar on screen, a playing motion or video, a running shortcut, a recording, or a connected tracking app lights up, also when you change it in VCam itself. The recording key shows the time.
- **Fades.** Scenes, expressions, and objects can change over a fade you choose.
- **Works with the dials of Stream Deck +.** Turn to zoom the camera or to change how strongly an expression shows.
- **Reconnects by itself.** Start VCam before or after Stream Deck; the keys follow once it is running.
- **Speaks your language.** English, Japanese, and Korean, the languages VCam supports, following Stream Deck's language setting.

## Requirements

- Stream Deck 7.1 or later on macOS 12 or later, or on Windows 10 or later
- VCamNova with the VCam API turned on in Settings > Integration
- To control VCam on another computer, allow connections from other devices there, and enter that computer's address and the token shown in the same settings under Connection in the action's settings

## Install

Download [com.vcamapp.vcam.streamDeckPlugin](https://github.com/vcamapp/vcam-streamdeck/releases/latest/download/com.vcamapp.vcam.streamDeckPlugin) and open it. Stream Deck installs the plugin.

## Actions

| Action | Press | Lights up while |
| --- | --- | --- |
| Scene | Switches to the scene | The scene is showing |
| Avatar | Switches to the avatar | The avatar is showing |
| Expression | Wears the expression, or takes it off | The expression is on |
| Motion | Plays the motion, or stops it | The motion is playing |
| Shortcut | Runs the shortcut | The shortcut is running |
| Recording | Starts or stops recording | Recording |
| Subtitle | Shows the text as the subtitle, or hides it | The text is showing |
| Object Visibility | Shows or hides the object | The object is showing |
| Video | Plays the video from the beginning, or pauses it | The video is playing |
| Emoji | Shows the emoji over the avatar | |
| Camera Preset | Moves the camera to the saved view; hold to save the view on screen | |
| Reset Camera | Puts the camera back | |
| Background Color | Changes the color behind everything on the canvas | |
| Tracking Status | Nothing | The tracking app or device is connected |
| Zoom (dial) | Turn to zoom, press to reset the camera | |
| Expression Weight (dial) | Turn to change the weight, press to turn it fully on or off | |

VCam takes the whole face at once, so wearing an expression takes the other expressions off.

Shortcut, Recording, Background Color, and Camera Preset need a VCam whose API is 0.1.1 or later. With an older VCam, these keys show an orange badge, and their settings say which API version they need.

## Development

```sh
npm install
npm run link    # builds the plugin and adds it to Stream Deck
npm run watch   # rebuilds and restarts the plugin on every change
npm test
npm run check   # types, build, and the Stream Deck validation
npm run pack    # writes .build/com.vcamapp.vcam.streamDeckPlugin
```

The plugin is built into `.build/com.vcamapp.vcam.sdPlugin` from `src/` and the files in `com.vcamapp.vcam.sdPlugin/`. The tests run against a fake VCam, so they need neither VCam nor Stream Deck.

Text is written in English in the code. Its Japanese and Korean are in `ja.json` and `ko.json` for Stream Deck and the plugin, and in `ui/locales.js` for the action settings. The action settings use [sdpi-components](https://sdpi-components.dev), bundled as `ui/sdpi-components.js` so that they work offline; update it with `scripts/update-sdpi.sh`.

See [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## License

MIT
