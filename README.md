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

Supported controllers: GRBL, GrblHAL, TinyG, Smoothie, Marlin.

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
