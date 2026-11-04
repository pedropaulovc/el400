# Developing EL400

## Local setup

Use Node.js 22.12 or newer and npm.

```sh
git clone https://github.com/pedropaulovc/el400.git
cd el400
npm ci
npm run dev
```

Run `npm run test:all` before pushing. `npm run build` produces the root-hosted
site in `dist/`; `npm run build:package` produces the npm distribution in `web/`.

## Building for CNCjs

To test a source build mounted at `/el400/`:

```sh
npm run build -- --base=/el400/
cncjs --mount /el400:/absolute/path/to/el400/dist
```

## Tech Stack

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Native GRBL protocol

### Units and work coordinates

With a GRBL controller selected, units are controller-owned. External `G20`/`G21`
changes update the EL400 indicator and readout. The inch/mm button or **U** key
requests the opposite controller unit; it does not immediately change the display
unit. The request is sent only after joining the actual serial port, with known
native modal units, an idle CNCjs workflow, and GRBL reporting `Idle`. Existing
keypad-lock, sleep and feature-state input gates still apply.

Screen-reader status announcements report pending requests and unavailable/error
states without adding visible text or layout space to the native EL400 face.
While pending, the LEDs retain the last confirmed units. When units are unknown
both unit LEDs are off. Confirmation comes from native
`controller:state.parserstate.modal.units`, not a socket write acknowledgement.
A request stops waiting after five seconds, a disconnect/port close, or an
observed controller error/alarm. Those error lines are shared across CNCjs
clients, so they are not proof that this particular command was rejected.
Late native confirmations still update the readout. Pending commands are never
replayed after reconnection.
On disconnect, the selected CNCjs readout retains its last physical coordinates
with an accessible unavailable announcement rather than switching to standalone counters.
Offline GRBL ABS zero/preset attempts do not change a local datum or queue replay.
INC remains local and uses the last machine position.

In **ABS**, GRBL's normalized work position (`WPos`) is authoritative. External
work-offset and active-WCS changes update ABS without machine movement. Zero,
axis-value entry, Half, probe datum operations and **Shift+0** request controller
work-coordinate changes. Shift+0 is one atomic XYZ request. These operations send
`G10 L20 P<n>` for the captured active `G54`–`G59` system (`P1`–`P6`), naming only
the affected axes and expressing the target in confirmed controller units. The
captured `G20` or `G21` is included on that same G10 line, so another client's
unit change while the request waits in the feeder cannot reinterpret its target.
GRBL itself accounts for G92 and tool-length offsets; EL400 does not subtract
them again. The command does not move an axis. No optimistic coordinate or local
datum update occurs: the readout follows actual native WPos, and completion waits
for the requested coordinates within native report resolution (0.001 mm or
0.0001 inch). A work request also requires fresh position data and a known WCS;
unit and work requests exclude one another. A WCS change cancels a pending work
request, and the same five-second/disconnect/error bounds apply.
Even a target matching cached WPos sends the explicit datum command: another
client may have changed the actual offset since the last composite snapshot.
EL400 queues a native `$G` marker behind G10, observes its correlated feeder write,
then requests fresh status to confirm the target. It does not await raw `[GC]`
or treat the marker/write itself as confirmation. This request-scoped status
acquisition is bounded to ten replies and five seconds, not a continuous poller.
Frozen probe readings retain their captured physical measurement across unit
changes; controller-owned probe datum results refresh on native WPos updates.

Physical positions, targets and offsets remain in millimetres internally.
GRBL **`$13`**, not `G20`/`G21`, determines status-report scaling. On joining or
changing the report setting, EL400 reads `$$` back from firmware and requests
a fresh status/WCO boundary before accepting newly scaled coordinates. Raw
settings replies are observable even if the cached setting did not change.
Cached composite controller snapshots are never reinterpreted under a new scale.
Fresh paired MPos/WPos reports (the native GRBL 0.9 format) also establish this
boundary without a literal WCO field. If the required fresh coordinates are
absent, this boundary operation is limited to ten `?` requests spaced 250 ms
apart and a five-second deadline; it is not a continuous poller. Failure
retains the last physical sample, reports work coordinates unavailable, and
requires reconnection or a new report-setting change to establish a fresh
boundary. A missing initial work position displays `no Conn`.

INC instead reads machine position relative to an independent local incremental
datum. INC edits never write controller work coordinates; external WPos changes
do not affect INC, while machine movement affects both modes. Manual/mock/debug
operation keeps local unit selection and local datums. Detected non-GRBL CNCjs
controllers retain display-only unit selection and their existing local datums;
they do not receive guessed GRBL commands. Unknown/disconnected native controllers
do not fall back to local ABS controls.

Protocol references:
- [CNCjs 1.11.5 GRBL runner](https://github.com/cncjs/cncjs/blob/v1.11.5/src/server/controllers/Grbl/GrblRunner.js)
  defines the composite parser/status snapshot.
- [CNCjs 1.11.5 GRBL controller](https://github.com/cncjs/cncjs/blob/v1.11.5/src/server/controllers/Grbl/GrblController.js)
  implements raw settings replies, explicitly requested status replies, cached
  settings/state emission and native G-code dispatch.
- [GRBL G10 coordinate-setting implementation](https://github.com/gnea/grbl/blob/bfb67f0c7963fe3ce4aaf8a97f9009ea5a8db36e/grbl/gcode.c#L510-L555)
  specifies active-WCS selection, omitted axes, G92 and tool-length compensation.

## Browser test fixtures

The E2E CNCjs server models native port discovery/join, settings/state/workflow
replay, `$$`/`$13` readback, and explicitly requested raw MPos/WCO status. G20/G21
changes modal working units, not status-report units. G10 L20 changes per-session
work offsets without moving the machine; the queued `$G` feeder marker precedes
the fresh status used to confirm the result. Sessions retain units and offsets
across page reloads and remain isolated from other tests. The session-scoped
external-work-position control models another client's offset change without motion.
The manual mock frontend and encoder/probe/signal HTTP controls still receive
state without joining a port.

The shared `dro` fixture explicitly seeds `workingUnit: 'G20'` for the existing
inch-based scenarios; this is not the mock controller's unseeded default (`G21`).
Use `test.use({ workingUnit: 'G21' })` for metric-controller scenarios. Seeding
happens only before first navigation, so a unit change really must survive a
controller-session reconnect. Use `test.use({ droSource: 'manual' })` for local
preference/default or standalone ABS-datum behavior rather than asserting
standalone semantics against a connected GRBL controller.

Connected `goto()`/`reload()` await confirmed unit status and fresh work-coordinate
readiness, not just React boot. Boot-message scenarios retain the boot-only
barrier; `goto({ waitForConnection: false })` explicitly opts out for offline
scenarios. `toggleInchMm()` waits for the confirmed unit indicator; intentionally
rejected or locked actions use `{ expectChange: false }` and assert the unchanged
display/error themselves.

## Project Info

**Live version**: [el400.vza.net](https://el400.vza.net)

**Lovable project URL**: https://lovable.dev/projects/269190d5-da7b-4375-80fd-1a9891f19e6a

## Deployment

Cloudflare Workers hosts the production build and isolated pull-request builds:

| Target | Trigger | Worker | Direct URL |
| --- | --- | --- | --- |
| Production | Push to `main` or manual workflow dispatch | `el400` | [el400.el400-vza-net-prod.workers.dev](https://el400.el400-vza-net-prod.workers.dev) |
| Pull request `N` | Open, update, or reopen a same-repository PR | `el400-pr-N` | `https://el400-pr-N.el400-ppe-vza-net.workers.dev` |

Closing or merging a pull request deletes its Worker. Pull requests from forks do
not receive Cloudflare credentials and therefore do not get a deployment.

The public production URL, [el400.vza.net](https://el400.vza.net), and the shared
PPE URL, [el400.ppe.vza.net](https://el400.ppe.vza.net), pass through the
[`vza-net-router`](https://github.com/pedropaulovc/vza-net-router) account bridge
before reaching the Workers in the isolated EL400 accounts. The shared
`el400-ppe` Worker backs the PPE URL; PR deployments do not overwrite it.

GitHub environments `cloudflare-production` and `cloudflare-ppe` provide each
workflow with its target account ID and API token. `wrangler.toml` remains
account-neutral so the same static-assets configuration works in both accounts.

## Publishing

1. Update `package.json` and `package-lock.json` to the release version and add
   a nonempty `## [<version>]` section to [CHANGELOG.md](CHANGELOG.md).
2. Run `npm run test:all` and `npm pack`. The pack lifecycle builds `web/`
   with `/el400/` as its base; `npm run build` still builds the root-hosted site
   in `dist/`.
3. Merge the release changes, then push the matching tag, for example
   `git tag v0.1.0 && git push origin v0.1.0`.

The `Publish npm package` workflow checks the tag against the package version and
changelog, runs the full test suite, and publishes with provenance. Stable
versions use npm's `latest` tag; prereleases use `next`. The matching changelog
section becomes the GitHub release notes.

Configure npm trusted publishing for package `el400`, GitHub owner
`pedropaulovc`, repository `el400`, workflow `publish-npm.yml`, and enable the
`npm publish` allowed action (new configurations default to staged publishing).
See [npm's trusted publisher settings](https://docs.npmjs.com/trusted-publishers/#for-github-actions).
The workflow uses GitHub OIDC and needs no npm token secret. Before the first automated release,
an npm maintainer must publish the initial package from an authenticated checkout
(`npm publish --access public`) and configure that trusted publisher on npm.
Use automated tag publishing for subsequent versions; npm rejects attempts to
republish an existing version.

## How to Edit This Code

**Use Lovable**

The [Lovable Project](https://lovable.dev/projects/269190d5-da7b-4375-80fd-1a9891f19e6a) is public. Click the **Remix** button to create your own copy and start prompting.

**Use your preferred IDE**

Clone this repo and push changes.

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.
