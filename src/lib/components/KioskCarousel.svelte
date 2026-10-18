<script lang="ts">
	import type { Snippet } from 'svelte';
	import { resolve } from '$app/paths';
	import { formatCount } from '$lib/utils/formatters';
	import VideoThumbnail from '$lib/components/VideoThumbnail.svelte';
	import type { KioskVideoConfig } from '$lib/adapters/kiosk';
	import logoPlaceholder from '$lib/assets/placeholders/logofallback.svg';

	interface Props {
		title: string;
		videos: KioskVideoConfig[];
		card?: Snippet<[KioskVideoConfig]>;
	}

	let { title, videos, card }: Props = $props();

	let track: HTMLDivElement | undefined = $state();
	let atStart: boolean = $state(true);
	let atEnd: boolean = $state(false);

	function updateEdges(): void {
		if (!track) return;
		const { scrollLeft, scrollWidth, clientWidth } = track;
		atStart = scrollLeft <= 1;
		atEnd = scrollLeft + clientWidth >= scrollWidth - 1;
	}

	function page(direction: 1 | -1): void {
		if (!track) return;
		track.scrollBy({ left: direction * Math.round(track.clientWidth * 0.9), behavior: 'smooth' });
	}

	function handleAvatarError(e: Event): void {
		const img = e.currentTarget as HTMLImageElement;
		// Swap to the placeholder once; if that fails too, don't loop
		if (img.dataset.fallback) return;
		img.dataset.fallback = 'true';
		img.src = logoPlaceholder;
	}

	$effect(() => {
		if (!track || videos.length === 0) return;
		updateEdges();
	});
</script>

<svelte:window onresize={updateEdges} />

<section class="mb-10">
	<div class="mb-3 flex items-center justify-between gap-4 px-1">
		<h2 class="text-primary text-lg font-semibold">{title}</h2>

		<div class="flex items-center gap-2">
			<button
				type="button"
				class="hidden size-8 items-center justify-center rounded-full bg-neutral-800 text-neutral-100 disabled:opacity-30 sm:flex"
				aria-label="Scroll {title} left"
				disabled={atStart}
				onclick={() => page(-1)}
			>
				&#8249;
			</button>
			<button
				type="button"
				class="hidden size-8 items-center justify-center rounded-full bg-neutral-800 text-neutral-100 disabled:opacity-30 sm:flex"
				aria-label="Scroll {title} right"
				disabled={atEnd}
				onclick={() => page(1)}
			>
				&#8250;
			</button>
		</div>
	</div>

	<div
		bind:this={track}
		onscroll={updateEdges}
		class="flex snap-x snap-mandatory scrollbar-none gap-4 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none]"
		role="list"
		aria-label={title}
	>
		{#each videos as video (video.id)}
			<div role="listitem" class="w-64 shrink-0 snap-start sm:w-72">
				{#if card}
					{@render card(video)}
				{:else}
					{@const videoHref = resolve('/video/[id]', { id: video.id })}

					<a href={videoHref} tabindex="-1" aria-hidden="true" class="block rounded-lg">
						<VideoThumbnail
							src={video.thumbnail}
							alt={`${video.title} thumbnail`}
							duration={video.duration}
						/>
					</a>

					<a href={videoHref} class="block">
						<h3 class="text-primary mt-2 line-clamp-2 text-sm leading-snug font-semibold">
							{video.title}
						</h3>
					</a>

					<a
						href={resolve('/channel/[channelId]', { channelId: video.channelId })}
						data-sveltekit-preload-data="tap"
						class="mt-1 flex min-w-0 items-center gap-2"
					>
						{#if video.channelAvatar}
							<img
								src={video.channelAvatar}
								alt=""
								loading="lazy"
								class="size-6 shrink-0 rounded-full object-cover"
								onerror={handleAvatarError}
							/>
						{/if}
						<span class="text-secondary truncate text-xs">{video.channelName}</span>
					</a>

					<p class="text-muted mt-1 text-xs">
						{#if video.viewCount > 0}
							{formatCount(video.viewCount)} views
						{/if}
						{#if video.viewCount > 0 && video.uploadDate}
							<span aria-hidden="true"> · </span>
						{/if}
						{video.uploadDate}
					</p>
				{/if}
			</div>
		{/each}
	</div>
</section>
