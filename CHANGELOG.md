# Changelog

## [0.3.0]

- Add accessible, user-initiated browser fullscreen entry and exit, matching Shopfloor Tablet's Fullscreen API behavior without changing the original EL400 face or CNCjs adapter.
- Synchronize the control with browser-owned fullscreen changes, and explain unavailable permissions, unsupported browsers and failed requests without falsely claiming success.
- Provide an embedded/failed-fullscreen same-URL new-tab link that retains CNCjs connection parameters and authentication, with no opener or referrer.

## [0.2.0]

- Synchronize CNCjs GRBL work coordinates with ABS in both directions. ABS datum edits wait for controller confirmation; machine coordinates remain the physical motion reference.
- Keep INC as an independent local datum. INC zero, preset, half, and probe operations do not change CNCjs work offsets, and external work-offset changes leave INC unchanged.
- Use controller work coordinates for ABS-based patterns, distance-to-go, SDM run, and reference operations.
- Wait for successful native datum confirmation before completing reference recall or linear-pattern setup. Unavailable work coordinates show `no Conn` and cannot overwrite learned SDM points.
- Ship uppercase `CHANGELOG.md` and `DEVELOPING.md`, with development and publishing instructions separate from the user README.

## [0.1.0]

- Distribute the EL400 simulator as a prebuilt static site in `web/`, configured for the CNCjs `/el400/` mount.
- Include the simulator's styles, illustrations, sounds, and bundled CNCjs Socket.IO clients without runtime npm dependencies.
- Publish npm packages from matching `v*` tags using GitHub Actions, with GitHub release notes taken from this changelog.
