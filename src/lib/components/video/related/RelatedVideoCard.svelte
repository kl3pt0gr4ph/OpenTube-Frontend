<script lang="ts">
	import logoPlaceholder from '#lib/assets/placeholders/logofallback.svg?raw';
	import thumbnailPlaceholder from '#lib/assets/placeholders/thumbnailFallback.svg?raw';
	import { formatCount } from '#lib/utils/formatters.js';
	import { resolve } from '$app/paths';
	import VideoThumbnail from '#lib/components/VideoThumbnail.svelte';
	import type { RelatedVideoConfig } from '#lib/adapters/related.js';

	let { video }: { video: RelatedVideoConfig } = $props();

	let thumbnail = $derived(video.thumbnail || thumbnailPlaceholder);

	function handleAvatarError(e: Event) {
		(e.currentTarget as HTMLImageElement).src = logoPlaceholder;
	}
</script>

<div class="group hover:bg-secondary relative mx-2 flex gap-2 rounded-lg p-2 transition-colors">
	<a
		href={resolve('/video/[id]', { id: video.id })}
		class="absolute inset-0 rounded-lg"
		aria-label={video.title}
	></a>

	<div class="relative w-40 shrink-0">
		<a href={resolve('/video/[id]', { id: video.id })} class="absolute inset-0 block w-full">
			<VideoThumbnail src={thumbnail} alt={`${video.title} thumbnail`} duration={video.duration} />
		</a>
	</div>

	<div class="flex min-w-0 flex-1 flex-col">
		<h3
			class="text-primary group-hover:text-accent line-clamp-2 text-sm font-semibold transition-colors"
		>
			{video.title}
		</h3>

		<div class="mt-1 flex items-center">
			<a
				href={resolve('/channel/[channelId]', { channelId: video.channelId })}
				data-sveltekit-preload-data="tap"
				class="relative z-20 flex items-center gap-2"
			>
				{#if video.channelAvatar}
					<img
						src={video.channelAvatar || logoPlaceholder}
						alt={`${video.id}-channel-avatar-${video.channelName}`}
						class="h-6 w-6 shrink-0 rounded-full object-cover"
						onerror={handleAvatarError}
					/>
				{/if}
				<p class="text-secondary truncate text-xs">
					{video.channelName}
				</p>
			</a>
		</div>

		<div class="text-muted mt-1 flex flex-row text-xs">
			<span>{formatCount(video.viewCount)} views</span>
			{#if video.uploadDate}
				<span class="mx-2">•</span>
				<span>{video.uploadDate}</span>
			{/if}
		</div>
	</div>
</div>
