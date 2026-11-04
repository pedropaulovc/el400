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

## Browser test fixtures

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
