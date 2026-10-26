# Changelog

All notable changes to this service are documented here.

The format is based on [keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). See [VERSIONING.md](VERSIONING.md) for how versions are chosen and released.

## [Unreleased]

### Added

- The stream proxy now runs inside the frontend at `/proxy`, replacing the separate Go OpenTubeStreamProxy service. Segment requests are same-origin, so CORS no longer applies. ([#86])
- Proxied responses include `server-timing: upstream;dur=…` and `x-upstream-status` headers, so slow or failing googlevideo nodes show up in DevTools. ([#86])
- The app now serves the backend API itself at `/api`, to the address in the `API_URL` environment variable. A reverse proxy can point straight at the frontend container. ([#88])
- `GET /health` answers `200 healthy` without calling the backend or rendering a page. ([#88])

### Changed

- Seeking or leaving a video now closes the upstream googlevideo download straight away, including before the first byte arrives. ([#86])
- The proxy follows googlevideo redirects itself instead of passing them to the browser. ([#86])
- Only media-related response headers are forwarded; cookies, CORS and other upstream headers are dropped. ([#86])
- Invalid `host` or `range` parameters are rejected with `400` (or `416`) before any request is made to googlevideo. ([#86])
- `X-Frame-Options: SAMEORIGIN` and `X-Content-Type-Options: nosniff` are now set by the app on every response. ([#88])
- The Docker `HEALTHCHECK` uses `/health` instead of `/`, which rendered the home page and called the API on every check. ([#88])
- The image sets `PORT=3636`, matching the exposed port. ([#88])

### Removed

Deployments no longer need the proxy container: route `/proxy` to the frontend instead, keeping the `/proxy` prefix. ([#86])

[#86]: https://github.com/kl3pt0gr4ph/OpenTube-Frontend/pull/86

## [0.5.0] - 2026-10-18

### Added

- Kiosk carousel cards on the landing page now show the uploader's channel avatar, with a placeholder fallback if the image fails to load. ([#74])
- The channel name and avatar on kiosk cards link to the internal channel page. ([#74])

### Changed

- Playback copes better with slow connections: the player buffers further ahead and waits for more video before resuming after a stall ([#65])
- The player prefers AV1, then VP9, then H.264, for more resolution at the same bandwidth ([#65])
- Videos start at a quality based on your connection's measured speed from previous videos, instead of a fixed guess ([#65])
- The big Play button now uses the Shaka 5 play/pause/buffering play button ([#66])
- Upgraded to SvelteKit 3, adapter-node 6, Vite 8 and TypeScript 6; building from source now requires Node.js 22.17 or later. ([#71])
- The Node server no longer reads the `ORIGIN` environment variable. ([#71])

[#74]: https://github.com/kl3pt0gr4ph/OpenTube-Frontend/pull/74
[#71]: https://github.com/kl3pt0gr4ph/OpenTube-Frontend/pull/71
[#66]: https://github.com/kl3pt0gr4ph/OpenTube-Frontend/pull/66
[#65]: https://github.com/kl3pt0gr4ph/OpenTube-Frontend/pull/65

## [0.4.0] - 2026-10-11

### Added

- Related items on the video page now render playlists and channels alongside videos, not just videos ([#57])
- Audio language menu in the player, labelled with YouTube's track names ([#57])
- Persisted playback preferences: the chosen audio and subtitle languages carry over to the next video ([#57])
- Player configuration: ABR starts around 720p–1080p and never fetches a resolution larger than the player ([#57])
- "Format Not Supported" error, without a retry button, when the browser can't decode any of a video's formats ([#57])

### Changed

- ErrorCard redesigned to match the app: SVG icons instead of emoji, icon beside the title and message, a rounded border with a background tinted by the variant colour, and larger text ([#43])
- The warning variant uses amber instead of grey ([#43])
- Empty search results and other "no results" states show a plain message instead of an error card ([#43])
- The muxed fallback is detected by `Content-Type: text/uri-list`; the `X-Stream-Type` header is still accepted for one release ([#57])
- Track menus show the manifest's labels, and AAC/Opus copies of one track appear as a single entry ([#57])
- A manually chosen quality resets to Auto on the next video ([#57])

### Fixed

- Navigating between videos now loads the new video in place instead of keeping the old one ([#57])
- The retry icon's circle and arrowhead are drawn correctly ([#57])

[#57]: https://github.com/kl3pt0gr4ph/OpenTube-Frontend/pull/57
[#43]: https://github.com/kl3pt0gr4ph/OpenTube-Frontend/pull/43

## [0.3.0] - 2026-09-09

### Added

- "Load more" button on search results, using the search API's next-page endpoint to fetch and append additional results without a full page reload.
- "Load more" button on channel pages, using the channel API's next-page endpoint to fetch and append further uploads without a full page reload.

### Fixed

- Landing page carousels were clipped to the shared layout container instead of spanning the full viewport width
- `PlaylistQueue` mobile view passed `relatedVideos` to the `videos` prop instead of `playlistVideos`, showing related videos in place of the playlist queue.

## [0.2.0] - 2026-08-27

### Added

- Landing page showing trending videos from gaming, music, movies and shows, and podcast feeds.

### Changed

- Base image moved from Node 20 to Node 24 LTS. Node 20 reached end of life in April 2026.
- Updated dependencies, including major versions of Vite, ESLint, jsdom, and the test tooling.
- Removed the unused `@sveltejs/adapter-auto` dependency.
- Video thumbnails now use the highest resolution the source provides.

## [0.1.1] - 2026-08-16

### Fixed

- Video playback now continues across desktop, mobile, and fullscreen layouts. The watch route mounted two players and only hid one with CSS, so each layout could be started independently.
- Watch pages no longer fetch the DASH manifest and buffer segments twice - a side effect of the duplicate player.
- Navigating between videos reloads the player in place instead of rebuilding it.
- Fixed a teardown race condition that could produce intermittent errors when navigating away from a video.

[Unreleased]: https://github.com/kl3pt0gr4ph/OpenTube-Frontend/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/kl3pt0gr4ph/OpenTube-Frontend/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/kl3pt0gr4ph/OpenTube-Frontend/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/kl3pt0gr4ph/OpenTube-Frontend/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/kl3pt0gr4ph/OpenTube-Frontend/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/kl3pt0gr4ph/OpenTube-Frontend/compare/v0.1.0...v0.1.1
