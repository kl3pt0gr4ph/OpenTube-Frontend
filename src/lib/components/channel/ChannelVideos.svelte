<script lang="ts">
	import { formatCount } from '#lib/utils/formatters.js';
	import { resolve } from '$app/paths';
	import VideoThumbnail from '#lib/components/VideoThumbnail.svelte';
	import videoCameraIcon from '#lib/assets/icons/videoCamera.svg?raw';
	import type { ChannelVideoConfig } from '#lib/adapters/channel.js';

	let { videos }: { videos: ChannelVideoConfig[] } = $props();
</script>

<div>
	{#if videos.length === 0}
		<div class="flex flex-col items-center justify-center px-6 py-12 text-center">
			<span class="text-muted mb-4 inline-block h-10 w-10">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html videoCameraIcon}
			</span>
			<p class="text-secondary text-sm">No videos available</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-4 px-6 pb-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each videos as video (video.id)}
				<a
					href={resolve('/video/[id]', { id: video.id })}
					data-sveltekit-preload-data="tap"
					class="group hover:bg-secondary flex cursor-pointer flex-col gap-2 rounded-lg p-2 transition-colors"
				>
					<!-- Thumbnail -->
					<VideoThumbnail
						src={video.thumbnail}
						alt={`${video.title} thumbnail`}
						duration={video.duration}
					/>

					<!-- Info -->
					<div class="flex flex-col">
						<h3
							class="text-primary group-hover:text-accent line-clamp-2 text-sm font-semibold transition-colors"
						>
							{video.title}
						</h3>
						<div class="text-secondary mt-1 flex flex-wrap items-center gap-x-1.5 text-xs">
							{#if video.viewCount > 0}
								<span>{formatCount(video.viewCount)} views</span>
							{/if}
							{#if video.uploadedDate}
								{#if video.viewCount > 0}
									<span class="text-muted">·</span>
								{/if}
								<span>{video.uploadedDate}</span>
							{/if}
						</div>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>
