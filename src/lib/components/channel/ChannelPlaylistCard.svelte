<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { getPlaylist } from '#lib/api/playlist.js';
	import type { ChannelPlaylistConfig } from '#lib/adapters/channel.js';

	let { playlist, album = false }: { playlist: ChannelPlaylistConfig; album?: boolean } = $props();

	let loading = $state(false);

	let countLabel = $derived.by(() => {
		const count = playlist.streamCount;
		if (count <= 0) return '';
		const noun = album ? 'track' : 'video';
		return `${count} ${count === 1 ? noun : `${noun}s`}`;
	});

	// Opens the playlist at its first video, as the search and related playlist cards do
	async function openPlaylist() {
		if (loading) return;
		try {
			loading = true;
			const data = await getPlaylist(playlist.id);
			const firstUrl = data.relatedItems?.[0]?.url;
			if (!firstUrl) throw new Error('Playlist has no videos');
			const videoId = new URL(firstUrl).searchParams.get('v');
			if (!videoId) throw new Error('Could not extract video ID');
			await goto(
				// eslint-disable-next-line svelte/no-navigation-without-resolve
				`${resolve('/video/[id]', { id: videoId })}?playlist=${encodeURIComponent(playlist.id)}&index=0`
			);
		} catch (e) {
			console.error('Failed to load playlist:', e);
		} finally {
			loading = false;
		}
	}
</script>

<div
	class="group hover:bg-secondary relative flex flex-col gap-2 rounded-lg p-2 transition-colors"
	class:opacity-60={loading}
>
	<!-- Covers the card, so the whole card opens the playlist -->
	<button
		type="button"
		class="absolute inset-0 z-10 cursor-pointer rounded-lg"
		aria-label={`Play ${album ? 'album' : 'playlist'} ${playlist.title}`}
		aria-busy={loading}
		onclick={openPlaylist}
	></button>

	<!-- Thumbnail, with two offset layers behind it to read as a stack -->
	<div class="relative mt-1.5 w-full">
		<div
			class="bg-muted absolute inset-x-0 top-0 h-full translate-x-1 -translate-y-1.5 rounded-lg opacity-40"
		></div>
		<div
			class="bg-muted absolute inset-x-0 top-0 h-full translate-x-0.5 -translate-y-0.75 rounded-lg opacity-60"
		></div>
		<div class="relative aspect-video w-full overflow-hidden rounded-lg">
			<img
				src={playlist.thumbnail}
				alt={`${playlist.title} thumbnail`}
				loading="lazy"
				decoding="async"
				class="size-full rounded-lg object-cover transition-transform group-hover:scale-105"
			/>
			{#if countLabel}
				<span
					class="absolute right-1 bottom-1 flex items-center gap-1 rounded bg-black/80 px-1 py-0.5 text-xs text-white"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-3 w-3"
						viewBox="0 0 24 24"
						fill="currentColor"
						aria-hidden="true"
					>
						<path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />
					</svg>
					{countLabel}
				</span>
			{/if}
		</div>
	</div>

	<!-- Info -->
	<div class="flex flex-col">
		<h3
			class="text-primary group-hover:text-accent line-clamp-2 text-sm font-semibold transition-colors"
		>
			{playlist.title}
		</h3>
	</div>
</div>
