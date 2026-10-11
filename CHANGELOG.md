# Changelog

All notable changes to this service are documented here.

The format is based on [keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). See [VERSIONING.md](VERSIONING.md) for how versions are chosen and released.

## [Unreleased]

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

[Unreleased]: https://github.com/kl3pt0gr4ph/OpenTube-Frontend/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/kl3pt0gr4ph/OpenTube-Frontend/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/kl3pt0gr4ph/OpenTube-Frontend/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/kl3pt0gr4ph/OpenTube-Frontend/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/kl3pt0gr4ph/OpenTube-Frontend/compare/v0.1.0...v0.1.1
