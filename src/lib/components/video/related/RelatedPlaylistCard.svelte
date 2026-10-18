<script lang="ts">
	import thumbnailPlaceholder from '#lib/assets/placeholders/thumbnailFallback.svg?raw';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { getPlaylist } from '#lib/api/playlist.js';
	import type { RelatedPlaylistConfig } from '#lib/adapters/related.js';

	let { playlist }: { playlist: RelatedPlaylistConfig } = $props();

	let thumbnail = $derived(playlist.thumbnail || thumbnailPlaceholder);
	let loading = $state(false);

	// -1 = unknown (hide the badge), -2 = "more than 100"
	let countLabel = $derived.by(() => {
		const count = playlist.streamCount;
		if (count === -2) return '100+ videos';
		if (count > 0) return `${count} ${count === 1 ? 'video' : 'videos'}`;
		return '';
	});

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
	class="group hover:bg-secondary relative mx-2 flex gap-2 rounded-lg p-2 transition-colors"
	class:opacity-60={loading}
>
	<button
		type="button"
		class="absolute inset-0 z-10 cursor-pointer rounded-lg"
		aria-label={`Play playlist ${playlist.title}`}
		aria-busy={loading}
		onclick={openPlaylist}
	></button>

	<div class="relative mt-1.5 w-40 shrink-0 self-start">
		<div
			class="bg-muted absolute inset-x-0 top-0 h-full translate-x-1 -translate-y-1.5 rounded-md opacity-40"
		></div>
		<div
			class="bg-muted absolute inset-x-0 top-0 h-full translate-x-0.5 -translate-y-0.75 rounded-md opacity-60"
		></div>
		<img
			src={thumbnail}
			alt={`Thumbnail for ${playlist.title}`}
			class="relative aspect-video w-full rounded-md object-cover"
		/>
		{#if countLabel}
			<div
				class="absolute right-1.5 bottom-1.5 flex items-center gap-1 rounded bg-black/80 px-1.5 py-0.5 text-xs font-semibold text-white"
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
			</div>
		{/if}
	</div>

	<div class="flex min-w-0 flex-1 flex-col">
		<h3
			class="text-primary group-hover:text-accent line-clamp-2 text-sm font-semibold transition-colors"
		>
			{playlist.title}
		</h3>

		{#if playlist.uploaderId}
			<a
				href={resolve('/channel/[channelId]', { channelId: playlist.uploaderId })}
				data-sveltekit-preload-data="tap"
				class="text-secondary relative z-20 mt-1 w-fit truncate text-xs hover:underline"
			>
				{playlist.uploaderName}
			</a>
		{:else}
			<p class="text-secondary mt-1 truncate text-xs">{playlist.uploaderName}</p>
		{/if}

		<p class="text-muted mt-1 text-xs">Playlist</p>
	</div>
</div>
