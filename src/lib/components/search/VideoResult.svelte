<script lang="ts">
	import { formatCount, formatDate } from '#lib/utils/formatters.js';
	import thumbnailPlaceholder from '#lib/assets/placeholders/thumbnailFallback.svg';
	import avatarPlaceholder from '#lib/assets/placeholders/logofallback.svg?raw';
	import { extractIdFromUrl } from '#lib/utils/streamSelection.js';
	import { resolve } from '$app/paths';
	import VideoThumbnail from '#lib/components/VideoThumbnail.svelte';
	import type { VideoSearchResultConfig } from '#lib/adapters/search.js';

	let { result }: { result: VideoSearchResultConfig } = $props();

	// Use placeholder only as fallbacks
	let thumbnail = $derived(result.thumbnail || thumbnailPlaceholder);
	let avatar = $derived(result.channelAvatar || avatarPlaceholder);
</script>

<div>
	<!-- Desktop Layout -->
	<div
		class="hover:bg-secondary hidden gap-4 rounded-lg p-4 shadow-sm transition-colors sm:grid sm:grid-cols-3"
	>
		<div class="col-span-1 flex items-start justify-center">
			<a href={resolve('/video/[id]', { id: result.id })} class="group w-full">
				<VideoThumbnail
					src={thumbnail}
					alt={`${result.title} thumbnail`}
					duration={result.duration}
				/>
			</a>
		</div>

		<div class="col-span-2 flex flex-col">
			<a href={resolve('/video/[id]', { id: result.id })} class="hover:underline">
				<h3 class="text-primary mb-1 text-lg font-semibold">{result.title}</h3>
			</a>
			<p class="text-muted mb-2 text-sm">
				<span>{formatCount(result.viewCount)} views</span>
				<span class="mx-1 inline-block align-middle">•</span>
				<span>{formatDate(result.uploadDate)}</span>
			</p>
			<a
				href={resolve('/channel/[channelId]', { channelId: extractIdFromUrl(result.channelUrl) })}
				class="col-space-2 my-3 flex items-center space-x-3 hover:opacity-80"
			>
				<img src={avatar} alt={result.channelName} class="h-8 w-8 rounded-full object-cover" />
				<p class="text-md text-primary font-semibold">
					{result.channelName}
					{#if result.verified}
						<span class="text-muted ml-1" title="Verified">✓</span>
					{/if}
				</p>
			</a>
			<p class="text-secondary line-clamp-3 overflow-hidden text-sm">{result.description}</p>
		</div>
	</div>

	<!-- Mobile Layout -->
	<div class="rounded-lg p-3 shadow-sm transition-colors sm:hidden">
		<a href={resolve('/video/[id]', { id: result.id })} class="group w-full">
			<VideoThumbnail
				src={thumbnail}
				alt={`${result.title} thumbnail`}
				duration={result.duration}
			/>
		</a>

		<div class="flex flex-col">
			<a href={resolve('/video/[id]', { id: result.id })} class="hover:underline">
				<h3 class="text-primary mb-2 line-clamp-2 text-base font-semibold">{result.title}</h3>
			</a>
			<a
				href={resolve('/channel/[channelId]', { channelId: extractIdFromUrl(result.channelUrl) })}
				class="mb-2 flex items-center space-x-2 hover:opacity-80"
			>
				<img src={avatar} alt={result.channelName} class="h-6 w-6 rounded-full object-cover" />
				<p class="text-primary text-sm font-medium">
					{result.channelName}
					{#if result.verified}
						<span class="text-muted ml-1 text-xs" title="Verified">✓</span>
					{/if}
				</p>
			</a>
			<p class="text-muted text-xs">
				<span>{formatCount(result.viewCount)} views</span>
				<span class="mx-1 inline-block align-middle">•</span>
				<span>{formatDate(result.uploadDate)}</span>
			</p>
			<p class="text-secondary mt-2 line-clamp-2 overflow-hidden text-xs">{result.description}</p>
		</div>
	</div>
</div>
