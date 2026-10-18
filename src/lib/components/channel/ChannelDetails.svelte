<script lang="ts">
	import logoPlaceholder from '#lib/assets/placeholders/logofallback.svg?raw';
	import videoCameraIcon from '#lib/assets/icons/videoCamera.svg?raw';
	import playlistIcon from '#lib/assets/icons/playlist.svg?raw';

	import type { ChannelConfig } from '#lib/adapters/channel.js';

	export type ChannelTab = 'home' | 'videos' | 'playlists';

	let {
		channel,
		activeTab = $bindable<ChannelTab>('videos'),
		videos,
		playlists
	}: {
		channel: ChannelConfig;
		activeTab?: ChannelTab;
		videos?: import('svelte').Snippet;
		playlists?: import('svelte').Snippet;
	} = $props();

	const tabs: { id: ChannelTab; label: string }[] = [
		{ id: 'videos', label: 'Videos' },
		{ id: 'playlists', label: 'Playlists' }
	];

	let descriptionExpanded = $state(false);
	const MAX_DESC_LENGTH = 180;
	const isDescriptionLong = $derived(
		!!channel.description && channel.description.length > MAX_DESC_LENGTH
	);
	const displayedDescription = $derived(
		isDescriptionLong && !descriptionExpanded
			? channel.description!.slice(0, MAX_DESC_LENGTH) + '...'
			: (channel.description ?? '')
	);

	function handleAvatarError(e: Event) {
		(e.currentTarget as HTMLImageElement).src = logoPlaceholder;
	}
</script>

<div class="flex w-full flex-col">
	<div class="bg-secondary w-full overflow-hidden" style="aspect-ratio: 32/9; max-height: 200px;">
		{#if channel.bannerUrl}
			<img src={channel.bannerUrl} alt="Channel banner" class="h-full w-full object-cover" />
		{:else}
			<div class="from-secondary to-muted h-full w-full bg-linear-to-r opacity-60"></div>
		{/if}
	</div>

	<div class="px-6 pt-3 pb-4">
		<div class="flex items-start gap-4">
			<div class="z-10 -mt-10 shrink-0">
				<img
					src={channel.avatarUrl || logoPlaceholder}
					alt="{channel.name} avatar"
					class="h-20 w-20 rounded-full border-4 border-(--color-bg,#fff) object-cover shadow-sm"
					onerror={handleAvatarError}
				/>
			</div>

			<div class="mt-2 flex min-w-0 flex-1 flex-col">
				<div class="flex items-center gap-1.5">
					<h1 class="text-primary text-xl leading-tight font-bold">{channel.name}</h1>
					{#if channel.verified}
						<svg
							class="text-secondary h-4 w-4 shrink-0"
							viewBox="0 0 24 24"
							fill="currentColor"
							aria-label="Verified channel"
						>
							<path
								d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1.41 14.59L6.7 12.7a.996.996 0 1 1 1.41-1.41l2.47 2.47 5.88-5.88a.996.996 0 1 1 1.41 1.41l-6.58 6.57a.996.996 0 0 1-1.41 0z"
							/>
						</svg>
					{/if}
				</div>

				<div class="text-secondary mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
					{#if channel.handle}
						<span>{channel.handle}</span>
						<span class="text-muted">·</span>
					{/if}
					<span>{channel.subscriberCount} subscribers</span>
					{#if channel.videoCount > 0}
						<span class="text-muted">·</span>
						<span>{channel.videoCount.toLocaleString()} videos</span>
					{/if}
				</div>

				{#if channel.description}
					<div class="text-secondary mt-2 max-w-2xl text-xs leading-relaxed">
						<span>{displayedDescription}</span>
						{#if isDescriptionLong}
							<button
								onclick={() => (descriptionExpanded = !descriptionExpanded)}
								class="text-accent hover:text-accent-hover ml-1 text-xs font-semibold transition-colors"
							>
								{descriptionExpanded ? 'Show less' : '...more'}
							</button>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Tab bar -->
	<div class="border-default border-b px-6">
		<div class="flex" role="tablist" aria-label="Channel sections">
			{#each tabs as tab (tab.id)}
				<button
					role="tab"
					aria-selected={activeTab === tab.id}
					onclick={() => (activeTab = tab.id)}
					class="relative cursor-pointer px-4 py-3 text-sm font-medium transition-colors
						{activeTab === tab.id ? 'text-primary' : 'text-secondary hover:text-primary'}"
				>
					{tab.label}
					{#if activeTab === tab.id}
						<span class="bg-primary absolute right-0 bottom-0 left-0 h-0.5 rounded-t-sm"></span>
					{/if}
				</button>
			{/each}
		</div>
	</div>

	<!-- Tab content -->
	<div class="mt-6">
		{#if activeTab === 'videos'}
			{#if videos}
				{@render videos()}
			{:else}
				<div class="flex flex-col items-center justify-center px-6 py-12 text-center">
					<span class="text-muted mb-4 inline-block h-10 w-10">
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						{@html videoCameraIcon}
					</span>
					<p class="text-secondary text-sm">No videos available</p>
				</div>
			{/if}
		{:else if activeTab === 'playlists'}
			{#if playlists}
				{@render playlists()}
			{:else}
				<div class="flex flex-col items-center justify-center px-6 py-12 text-center">
					<span class="text-muted mb-4 inline-block h-10 w-10">
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						{@html playlistIcon}
					</span>
					<p class="text-secondary text-sm">No playlists available</p>
				</div>
			{/if}
		{/if}
	</div>
</div>
