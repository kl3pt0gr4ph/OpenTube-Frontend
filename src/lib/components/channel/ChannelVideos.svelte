<script lang="ts">
	import { formatCount } from '#lib/utils/formatters.ts';
	import { resolve } from '$app/paths';
	import VideoThumbnail from '#lib/components/VideoThumbnail.svelte';
	import ChannelEmptyState from '#lib/components/channel/ChannelEmptyState.svelte';
	import type { ChannelVideoConfig } from '#lib/adapters/channel.ts';

	let {
		videos,
		tab = 'videos'
	}: { videos: ChannelVideoConfig[]; tab?: 'videos' | 'shorts' | 'livestreams' } = $props();

	const isShorts = $derived(tab === 'shorts');
</script>

{#snippet card(video: ChannelVideoConfig)}
	<VideoThumbnail
		src={video.thumbnail}
		alt={`${video.title} thumbnail`}
		duration={video.duration}
		portrait={isShorts}
	/>

	<div class="flex flex-col">
		<h3
			class="text-primary group-hover:text-accent line-clamp-2 text-sm font-semibold transition-colors"
		>
			{video.title}
		</h3>
		<div class="text-secondary mt-1 flex flex-wrap items-center gap-x-1.5 text-xs">
			{#if video.isLive}
				<span>Live or upcoming · can't be played yet</span>
			{:else}
				{#if video.viewCount > 0}
					<span>{formatCount(video.viewCount)} views</span>
				{/if}
				{#if video.uploadedDate}
					{#if video.viewCount > 0}
						<span class="text-muted">·</span>
					{/if}
					<span>{video.uploadedDate}</span>
				{/if}
			{/if}
		</div>
	</div>
{/snippet}

<div>
	{#if videos.length === 0}
		<ChannelEmptyState message={`No ${tab} available`} />
	{:else}
		<div
			class="grid gap-4 px-6 pb-8 {isShorts
				? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'
				: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}"
		>
			{#each videos as video (video.id)}
				{#if video.isLive}
					<!-- Live streams need HLS, which is not implemented yet, so the card isn't a link -->
					<div class="flex cursor-not-allowed flex-col gap-2 rounded-lg p-2 opacity-60">
						{@render card(video)}
					</div>
				{:else}
					<a
						href={resolve('/video/[id]', { id: video.id })}
						data-sveltekit-preload-data="tap"
						class="group hover:bg-secondary flex cursor-pointer flex-col gap-2 rounded-lg p-2 transition-colors"
					>
						{@render card(video)}
					</a>
				{/if}
			{/each}
		</div>
	{/if}
</div>
