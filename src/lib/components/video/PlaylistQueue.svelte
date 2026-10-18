<script lang="ts">
	import { formatDuration } from '#lib/utils/formatters.js';
	import { resolve } from '$app/paths';
	import { tick } from 'svelte';
	import type { RelatedVideoConfig } from '#lib/adapters/related.js';

	interface Props {
		videos: RelatedVideoConfig[];
		playlistId: string;
		currentIndex: number;
		playlistName?: string;
	}

	let { videos, playlistId, currentIndex, playlistName = 'Playlist' }: Props = $props();

	function scrollActiveIntoView(node: HTMLElement, isActive: boolean) {
		if (isActive) tick().then(() => node.scrollIntoView({ block: 'nearest' }));
		return {
			update(newIsActive: boolean) {
				if (newIsActive) node.scrollIntoView({ block: 'nearest' });
			}
		};
	}
</script>

<div
	class="border-default bg-card flex h-full max-h-105 flex-col overflow-hidden rounded-lg border"
>
	<!-- Header -->
	<div class="border-default flex shrink-0 items-center justify-between border-b px-4 py-3">
		<div>
			<h2 class="text-primary text-sm font-semibold">{playlistName}</h2>
			<p class="text-muted mt-0.5 text-xs">{currentIndex + 1} / {videos.length}</p>
		</div>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			class="text-muted h-4 w-4"
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden="true"
		>
			<path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />
		</svg>
	</div>

	<!-- Scrollable list -->
	<div class="flex-1 overflow-y-auto py-1">
		{#each videos as video, i (video.id)}
			{@const isActive = i === currentIndex}

			<a
				use:scrollActiveIntoView={isActive}
				href="{resolve('/video/[id]', { id: video.id })}?playlist={encodeURIComponent(
					playlistId
				)}&index={i}"
				class="hover:bg-secondary relative flex gap-3 px-3 py-2 transition-colors
        {isActive ? 'bg-accent/10' : ''}"
				aria-current={isActive ? 'true' : undefined}
			>
				<!-- Active bar -->
				{#if isActive}
					<div class="bg-accent absolute top-0 bottom-0 left-0 w-0.5 rounded-r"></div>
				{/if}

				<!-- Index / playing indicator -->
				<div class="flex w-5 shrink-0 items-center justify-center">
					{#if isActive}
						<!-- Animated playing bars -->
						<div class="flex h-4 items-end gap-px">
							<span
								class="bg-accent w-0.5 animate-[bounce_0.8s_ease-in-out_infinite] rounded-sm"
								style="height:60%"
							></span>
							<span
								class="bg-accent w-0.5 animate-[bounce_0.8s_ease-in-out_0.15s_infinite] rounded-sm"
								style="height:100%"
							></span>
							<span
								class="bg-accent w-0.5 animate-[bounce_0.8s_ease-in-out_0.3s_infinite] rounded-sm"
								style="height:40%"
							></span>
						</div>
					{:else}
						<span class="text-muted text-xs">{i + 1}</span>
					{/if}
				</div>

				<!-- Thumbnail -->
				<div class="relative w-28 shrink-0">
					<div class="relative" style="aspect-ratio: 16/9;">
						<img
							src={video.thumbnail}
							alt={`Thumbnail for ${video.title}`}
							class="h-full w-full rounded object-cover {isActive ? 'ring-accent ring-1' : ''}"
						/>
						{#if video.duration > 0}
							<span
								class="absolute right-1 bottom-1 rounded bg-black/80 px-1 py-0.5 text-xs text-white"
							>
								{formatDuration(video.duration)}
							</span>
						{/if}
					</div>
				</div>

				<!-- Info -->
				<div class="flex min-w-0 flex-1 flex-col justify-center">
					<h3 class="text-primary line-clamp-2 text-xs font-medium {isActive ? 'text-accent' : ''}">
						{video.title}
					</h3>
					<p class="text-muted mt-1 truncate text-xs">{video.channelName}</p>
				</div>
			</a>
		{/each}
	</div>
</div>
