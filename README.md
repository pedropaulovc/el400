# EL400 Digital Readout (DRO) Simulator

A faithful web-based simulator for the Electronica EL400 (a.k.a. MagXact MX-100M) digital readout (DRO) system.

**Live version**: [el400.vza.net](https://el400.vza.net)

![EL400 Simulator](public/el400-screenshot.png)

## Overview

CNC milling machine users sometimes need to operate their machines in fully manual mode, using a [pendant controller](https://github.com/pedropaulovc/whb04b-6) for precise jogging and positioning. However, current G-code sender applications are not optimized for this workflow.

### The Problem with Current G-Code Senders

Popular G-code senders like [CNCjs](https://github.com/cncjs/cncjs) and [Universal Gcode Sender (UGS)](https://github.com/winder/Universal-G-Code-Sender) are designed primarily for mouse and keyboard interaction. Their interfaces are cramped and difficult to use on touch screens:

| CNCjs | Universal Gcode Sender |
|-------|------------------------|
| ![CNCjs interface](public/cncjs-screenshot.png) | ![UGS interface](public/ugs-screenshot.png) |
| *Dense UI with small buttons* | *Complex panels optimized for desktop* |

More importantly, these G-code senders lack essential machinist calculator functions that traditional DRO units provide out of the box:

| Feature | EL400 DRO | CNCjs | UGS |
|---------|-----------|-------|-----|
| Half Function (centerline finding) | Yes | No | No |
| Built-in Calculator | Yes | No | No |
| Bolt Hole Circle | Yes | No | No |
| Bolt Hole Arc | Yes | No | No |
| Linear Hole Patterns | Yes | No | No |
| Grid Patterns | Yes | No | No |
| Center of Circle (3-point) | Yes | No | No |
| Center of Line | Yes | No | No |
| Arc Contouring | Yes | No | No |
| Taper Calculations | Yes | No | No |
| Distance to Go | Yes | Partial | Partial |
| Sub-Datum Memory | Yes | No | No |

### The Solution

This project recreates the EL400/MX-100M DRO interface as a web application, designed to be integrated with G-code senders. When displayed maximized on a touch screen alongside a pendant controller, it provides ergonomics equivalent to manual milling machines equipped with a traditional DRO unit.

The simulator focuses on:
- **Touch-friendly interface**: Large buttons and displays optimized for shop floor use
- **Complete machinist functions**: All the calculator features machinists expect from a DRO
- **CNC integration**: Connect to CNCjs or other G-code senders for live position display
- **Accessibility**: WCAG compliance, keyboard navigation, screen reader support, forced-colors mode ([details](ACCESSIBILITY.md))
- **Accurate reproduction**: Faithful recreation of the original hardware's behavior

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

## npm distribution

The `el400` package contains a prebuilt simulator in `web/`, configured for a
`/el400/` URL prefix. It has no runtime npm dependencies and does not expose a
React API or CLI.

```sh
npm install --save-exact el400@0.1.0
```

Mount `node_modules/el400/web` as static files at `/el400/` in CNCjs, then add
`/el400/?source=cncjs` as a custom widget. Keep the trailing slash. CNCjs supplies
the widget session token; the simulator connects to the same origin. Without
`source=cncjs`, the simulator runs in manual mode.

For [cncjs-whb04b6-el400-integration](https://github.com/pedropaulovc/cncjs-whb04b6-el400-integration),
setup can use the installed package's `web/` directory as `el400.mountPath`
instead of cloning and building this repository. That consumer change is
separate; existing integration releases still use their pinned checkout.

### Publishing

1. Update `package.json` and `package-lock.json` to the release version and add
   a nonempty `## [<version>]` section to [changelog.md](changelog.md).
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

## Tech Stack

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Getting Started

### Prerequisites

- Node.js & npm - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

### Installation

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm i

# Start development server
npm run dev
```

## Using with CNCjs

The DRO can display live position data from your CNC machine when used with
[CNCjs](https://github.com/cncjs/cncjs). It connects over CNCjs's Socket.IO
interface and mirrors the controller's machine position and probe state, so
jogging, running G-code, or a `G38.2` probe cycle in CNCjs is reflected on the
readout in real time.

The adapter includes readout normalizers for GRBL, GrblHAL, TinyG, Smoothie and
Marlin. Controller-confirmed unit and work-coordinate controls below are scoped
to native GRBL through CNCjs 1.11.5; other controller readouts are unchanged.

### 1. Install and run CNCjs

```sh
# Install CNCjs globally (Node.js 18+ recommended)
npm install -g cncjs

# Start it (defaults to http://localhost:8000)
cncjs
```

Open CNCjs, choose your serial port and controller, and click **Open** to
connect to the machine.

### 2. Build the DRO and serve it from CNCjs

Build the app with a base path, then mount the build into CNCjs so it is served
same-origin (this avoids cross-origin and mixed-content issues behind HTTPS
proxies):

```sh
# Build with the path it will be mounted at
npm install
npm run build -- --base=/el400/

# Serve the build at /el400 alongside CNCjs
cncjs --mount /el400:/absolute/path/to/el400/dist
```

The DRO is now available at `http://localhost:8000/el400/`.

### 3. Add it as a custom widget

1. In the CNCjs workspace, open the **≡ Manage Widgets** menu and enable
   **Custom Widget**.
2. On the new widget, click the **⚙ (Edit)** icon and set:
   - **Title**: `EL400 DRO`
   - **URL**: `/el400/?source=cncjs`
3. Toggle the widget **Enable** control. CNCjs appends its auth token to the
   iframe URL automatically, and the DRO joins the active serial port and
   starts mirroring position.

### Standalone window

You can also open the DRO in its own tab. When served same-origin via
`--mount`, no host/port is needed:

```
http://localhost:8000/el400/?source=cncjs&token=<CNCjs session token>
```

To point at a CNCjs instance on a different origin, pass `host`/`port`
explicitly (`host` may be a bare hostname or a full `https://…` origin).

### Query parameters

| Parameter    | Description                                                                                 |
| ------------ | ------------------------------------------------------------------------------------------- |
| `source`     | Set to `cncjs` to use the CNCjs adapter.                                                     |
| `host`       | CNCjs host. Omit when served same-origin; accepts a bare host or a full `https://…` origin.  |
| `port`       | CNCjs port (default `8000`). Ignored if `host` already includes a port.                      |
| `token`      | CNCjs auth token. Added automatically for embedded widgets; required for a standalone tab.   |
| `serialport` | Optional. Join this specific serial port instead of auto-discovering the active one.         |

For implementation details, see the CNCjs adapter in [`src/adapters/CncjsMillAdapter.ts`](src/adapters/CncjsMillAdapter.ts).

### GRBL units and INC work coordinates

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
Offline GRBL INC zero/preset attempts do not change a local datum or queue replay.

In **INC**, GRBL's normalized work position (`WPos`) is authoritative. External
work-offset changes and active-WCS changes therefore update the EL400 without
machine movement. Zero, axis-value entry, Half, probe datum operations and
**Shift+0** request work-coordinate changes rather than maintaining an independent
EL400 INC datum. Shift+0 is one atomic XYZ request. These operations send
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

ABS retains the EL400's existing local datum behavior. Manual/mock/debug operation
also keeps local unit selection and INC counters. Detected non-GRBL CNCjs
controllers retain **display-only** unit selection and their existing local INC
datum behavior; they do not receive guessed GRBL commands. Unknown/disconnected
CNCjs controllers do not silently fall back to local controller-owned controls.

Protocol references:
- [CNCjs 1.11.5 GRBL runner](https://github.com/cncjs/cncjs/blob/v1.11.5/src/server/controllers/Grbl/GrblRunner.js)
  defines the composite parser/status snapshot.
- [CNCjs 1.11.5 GRBL controller](https://github.com/cncjs/cncjs/blob/v1.11.5/src/server/controllers/Grbl/GrblController.js)
  implements raw settings replies, explicitly requested status replies, cached
  settings/state emission and native G-code dispatch.
- [GRBL G10 coordinate-setting implementation](https://github.com/gnea/grbl/blob/bfb67f0c7963fe3ce4aaf8a97f9009ea5a8db36e/grbl/gcode.c#L510-L555)
  specifies active-WCS selection, omitted axes, G92 and tool-length compensation.

### Browser test fixtures

The E2E CNCjs server models native port discovery/join, settings/state/workflow
replay, `$$`/`$13` readback, and explicitly requested raw MPos/WCO status. G20/G21
changes modal working units, not status-report units. G10 L20 changes per-session
work offsets without moving the machine; the queued `$G` feeder marker precedes
the fresh status used to confirm the result. Sessions retain units and offsets
across page reloads and remain isolated from other tests. The manual mock frontend
and its encoder/probe/signal HTTP controls still receive state without joining a port.

The shared `dro` fixture explicitly seeds `workingUnit: 'G20'` for the existing
inch-based scenarios; this is not the mock controller's unseeded default (`G21`).
Use `test.use({ workingUnit: 'G21' })` for metric-controller scenarios. Seeding
happens only before first navigation, so a unit change really must survive a
controller-session reconnect. Use `test.use({ droSource: 'manual' })` for local
preference/default or independent ABS/INC-memory behavior rather than asserting
standalone semantics against a connected GRBL controller.

Connected `goto()`/`reload()` await confirmed unit status and fresh work-coordinate
readiness, not just React boot. Boot-message scenarios retain the boot-only
barrier; `goto({ waitForConnection: false })` explicitly opts out for offline
scenarios. `toggleInchMm()` waits for the confirmed unit indicator; intentionally
rejected or locked actions use `{ expectChange: false }` and assert the unchanged
display/error themselves.


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

## DRO Specifications

The simulator behavior is based on official manuals (originals plus searchable OCR text are archived in the [references repo](https://github.com/pedropaulovc/harmonic-analyzer-references)):
- [EL400 Operation Manual](https://www.dropros.com/documents/EL400%20OpManual.pdf) — archived [PDF](https://github.com/pedropaulovc/harmonic-analyzer-references/blob/main/el400-operation-manual/EL400-OpManual.pdf) · [OCR text](https://github.com/pedropaulovc/harmonic-analyzer-references/blob/main/el400-operation-manual/ocr/markdown.md)
- [MagXact MX-100M Manual](https://cdn.shopify.com/s/files/1/0576/0984/6859/files/MagXact-MX-100M-Mill-DRO-V1-9-1-2021.pdf) — archived [PDF](https://github.com/pedropaulovc/harmonic-analyzer-references/blob/main/magxact-mx100m-mill-dro-manual/MagXact-MX-100M-Mill-DRO-V1-9-1-2021.pdf) · [OCR text](https://github.com/pedropaulovc/harmonic-analyzer-references/blob/main/magxact-mx100m-mill-dro-manual/ocr/markdown.md)

It is also based on the DRO PROS video walkthrough, ["Electronica EL400 Magnetic Display for Milling Machine — Overview"](https://www.youtube.com/watch?v=7W47KPCu7jE). An illustrated, step-by-step manual transcribed from that video — covering the setup menu and every front-panel function — is available here:
- [EL400 video manual](https://github.com/pedropaulovc/harmonic-analyzer-references/blob/main/el400-dro-overview-video/MANUAL.md)
- [Video transcript](https://github.com/pedropaulovc/harmonic-analyzer-references/blob/main/el400-dro-overview-video/transcript.txt)

## License

MIT License - see LICENSE file for details
