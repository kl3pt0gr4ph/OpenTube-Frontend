<script lang="ts">
	import thumbnailPlaceholder from '#lib/assets/placeholders/thumbnailFallback.svg';
	import { goto } from '$app/navigation';
	import { getPlaylist } from '#lib/api/playlist.js';
	import { resolve } from '$app/paths';
	import type { PlaylistSearchResultConfig } from '#lib/adapters/search.js';

	let { result }: { result: PlaylistSearchResultConfig } = $props();

	let thumbnail = $derived(result.thumbnail || thumbnailPlaceholder);
	let loading = $state(false);

	// TODO: Update redirect to correct endpoint when created.
	async function redirectToPlaylist() {
		if (loading) return;
		try {
			loading = true;
			const playlist = await getPlaylist(result.id);
			const firstVideo = playlist.relatedItems?.[0];
			if (!firstVideo?.url) throw new Error('Playlist has no videos');
			const videoId = firstVideo.url.split('v=')[1]?.split('&')[0];
			if (!videoId) throw new Error('Could not extract video ID');
			await goto(
				// eslint-disable-next-line svelte/no-navigation-without-resolve
				`${resolve('/video/[id]', { id: videoId })}?playlist=${encodeURIComponent(result.id)}&index=0`
			);
		} catch (e) {
			console.error('Failed to load playlist:', e);
		} finally {
			loading = false;
		}
	}
	function handleKey(event: KeyboardEvent) {
		if (event.key === 'Enter') redirectToPlaylist();
	}
</script>

<div>
	<!-- Desktop Layout (sm and above) - Horizontal grid matching VideoResult -->
	<div
		class="hover:bg-secondary hidden gap-4 rounded-lg p-4 shadow-sm transition-colors sm:grid sm:grid-cols-3"
	>
		<!-- Left side – stacked thumbnail (1/3) -->
		<div class="col-span-1 flex items-start justify-center">
			<div
				role="button"
				tabindex="0"
				onclick={redirectToPlaylist}
				onkeydown={handleKey}
				class="w-full cursor-pointer"
			>
				<!-- Stacked thumbnail effect — two offset layers suggest a pile of videos -->
				<div class="relative w-full">
					<div
						class="bg-muted absolute inset-x-0 top-0 h-full translate-x-1 -translate-y-1.5 rounded-md opacity-40"
					></div>
					<div
						class="bg-muted absolute inset-x-0 top-0 h-full translate-x-0.5 -translate-y-0.75 rounded-md opacity-60"
					></div>
					<img
						src={thumbnail}
						alt={`Thumbnail for ${result.title}`}
						class="relative h-auto w-full rounded-md object-cover"
					/>
					<!-- Video count badge -->
					<div
						class="absolute right-2 bottom-2 flex items-center gap-1 rounded bg-black/80 px-1.5 py-0.5 text-xs font-semibold text-white"
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
						{result.videoCount} videos
					</div>
				</div>
			</div>
		</div>

		<!-- Right side – text (2/3) -->
		<div class="col-span-2 flex flex-col justify-center">
			<div
				role="button"
				tabindex="0"
				onclick={redirectToPlaylist}
				onkeydown={handleKey}
				class="cursor-pointer hover:underline"
			>
				<h3 class="text-primary mb-1 text-lg font-semibold">{result.title}</h3>
			</div>
			<p class="text-muted mb-1 text-sm">Playlist</p>
			<!-- eslint-disable svelte/no-navigation-without-resolve -->
			<!-- TODO: Replace href -->
			<a
				href={result.uploaderUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="text-secondary mt-1 flex w-fit items-center gap-1 text-sm hover:underline"
				onclick={(e) => e.stopPropagation()}
			>
				{result.uploaderName}
			</a>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		</div>
	</div>

	<!-- Mobile Layout (below sm) - Vertical -->
	<div
		role="button"
		tabindex="0"
		onclick={redirectToPlaylist}
		onkeydown={handleKey}
		class="hover:bg-secondary cursor-pointer rounded-lg p-3 shadow-sm transition-colors sm:hidden"
	>
		<!-- Stacked thumbnail - Full Width -->
		<div class="relative mb-3 w-full">
			<div
				class="bg-muted absolute inset-x-0 top-0 h-full translate-x-0.75 -translate-y-1.25 rounded-md opacity-40"
			></div>
			<div
				class="bg-muted absolute inset-x-0 top-0 h-full translate-x-[1.5px] translate-y-[-2.5px] rounded-md opacity-60"
			></div>
			<img
				src={thumbnail}
				alt={`Thumbnail for ${result.title}`}
				class="relative h-auto w-full rounded-md object-cover"
			/>
			<!-- Video count badge -->
			<div
				class="absolute right-2 bottom-2 flex items-center gap-1 rounded bg-black/80 px-1.5 py-0.5 text-xs font-semibold text-white"
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
				{result.videoCount} videos
			</div>
		</div>

		<!-- Content below thumbnail -->
		<div class="flex flex-col">
			<p class="text-muted mb-0.5 text-xs tracking-wide uppercase">Playlist</p>
			<h3 class="text-primary mb-1 line-clamp-2 text-base font-semibold">{result.title}</h3>
			<p class="text-secondary text-sm">{result.uploaderName}</p>
		</div>
	</div>
</div>
