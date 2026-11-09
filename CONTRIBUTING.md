# Contributing

Thank you for your interest in VCam for Stream Deck. This project is maintained by a single person with limited time for review. The rules below exist so that contributions can be reviewed and merged reliably within that time. Pull requests that do not follow them may be closed regardless of their content.

## Discuss large changes in an issue first

Unless your change is a bug fix, a typo fix in the documentation, or a minor suggestion, open an issue and agree on the approach before writing a pull request. The following always require prior discussion:

- New actions, or changes to what an action sends or how a key looks
- Changes to dependencies or the supported platforms
- Changes to the build, the GitHub Actions workflows or the release process

The plugin uses only the public VCam API. Features that VCam itself should offer belong to [VCam](https://github.com/vcamapp/app/issues), not here.


If a large pull request arrives without prior discussion and its design does not match the direction of the project, none of it can be accepted. Reach agreement in an issue before you start implementing.

## One pull request, one purpose

- Solve exactly one problem per pull request. Put "while I was at it" changes in separate pull requests
- Keep the change under 300 lines as a guideline, and under 500 lines at most, not counting tests. If it has to be larger, propose how to split it in an issue first
- Pull requests that bundle several changes, bring over the state of a fork as is, or resolve several issues at once will not be accepted
- Keep refactoring separate from feature work

## Checklist before opening a pull request

- [ ] The description links the related issue (for example `Closes #123`)
- [ ] The change has a single, focused purpose
- [ ] The branch is rebased on the latest `main`
- [ ] `npm test` and `npm run check` pass
- [ ] Tests covering the changed behavior are added or updated
- [ ] No unrelated files are included (formatting-only diffs, generated files, and so on)
- [ ] The README is updated if what users see or do changed

## Code

- Match the style, naming, and comment density of the surrounding code
- Write comments only where they explain why something is done. Comments that describe what the code does, or what was changed, are not needed
- Do not leave commented-out code behind
- Check that the running VCam offers a method before relying on it, since people keep using the VCam version they bought
- Add Japanese and Korean for any text users see: in `ja.json` and `ko.json` for Stream Deck and the plugin, and in `ui/locales.js` for the action settings. The tests fail when a translation is missing
- Build output goes to `.build/`

## Tests

```sh
npm test
npm run check
```

The tests run against a fake VCam, so they need neither VCam nor Stream Deck.

To try a change, run `npm run link` once and then `npm run watch`, and use the keys against VCam with the VCam API turned on. Work in a copy of a scene, since changes made through the API are saved to the scene.

GitHub Actions runs the same checks. Pull requests with failing checks will not be reviewed.

## Changes made with AI tools

Using AI tools is not prohibited, but the following applies:

- Before submitting, read, understand, and verify every line of the change yourself. Do not submit changes you cannot explain
- Do not submit large AI-generated changes as they are. The size and scope limits above apply unchanged
- Claims such as "tested" or "verified" in the pull request description must describe what you actually did yourself
- If you used an AI tool, mention it in the pull request description or in a commit trailer. This is not required, but it helps the review

## Review

- Review can take time. Please refrain from posting reminders while waiting for a reply
- A change may be declined because it does not fit the direction of the project, or because its maintenance cost outweighs its benefit
- Pull requests that receive no reply or update for an extended period will be closed

## Releases

In the Actions tab, run the Release workflow on the default branch with the version, such as `0.1.0`. It writes the version into `com.vcamapp.vcam.sdPlugin/manifest.json`, runs the checks and the tests, packages the plugin, commits and tags the version, and creates a GitHub release with `com.vcamapp.vcam.streamDeckPlugin`. Submit that file to the Elgato Marketplace in Maker Console. `npm run pack` makes the same file locally, in `.build`.

`Nodejs.Debug` in the manifest takes Node.js command-line arguments, or `enabled` or `break` for a debugger, and Stream Deck applies it only in developer mode (`streamdeck dev`). Users do not run in developer mode, so the debugger stays off for them. Any other word, such as `disabled`, is passed to Node.js as is and stops the plugin from starting.

The Marketplace app icon and thumbnail come from `marketplace/`. After changing them, run `marketplace/render.sh` (it needs Xcode with Icon Composer, Google Chrome, and ImageMagick) to write them to `.build/marketplace` and update the plugin icon in `com.vcamapp.vcam.sdPlugin/imgs/plugin`.

## License

By contributing, you agree that your contribution is released under the project's [license](./LICENSE).
