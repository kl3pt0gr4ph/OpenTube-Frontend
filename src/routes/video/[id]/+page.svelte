<script lang="ts">
	import type { PageData } from './$types';

	import { onMount } from 'svelte';
	import VideoPlayer from '#lib/components/video/VideoPlayer.svelte';
	import VideoDetail from '#lib/components/video/VideoDetail.svelte';
	import RelatedItemListings from '#lib/components/video/related/RelatedItemListings.svelte';
	import ErrorCard from '#lib/components/ErrorCard.svelte';
	import Comments from '#lib/components/video/Comments.svelte';
	import PlaylistQueue from '#lib/components/video/PlaylistQueue.svelte';

	let { data }: { data: PageData } = $props();

	let playerConfig = $derived(
		data.playerConfig ?? {
			videoStream: null,
			audioStream: null,
			subtitles: [],
			duration: 0,
			poster: ''
		}
	);

	let metadata = $derived(
		data.metadata ?? {
			title: '',
			description: '',
			channelName: '',
			channelAvatar: '',
			viewCount: 0,
			uploadDate: '',
			likeCount: 0,
			dislikeCount: 0,
			subscriberCount: 0
		}
	);

	let relatedItems = $derived(data.relatedItems ?? []);
	let comments = $derived(data.comments ?? []);
	let error = $derived(data.error ?? null);
	let playlistId = $derived(data.playlistId ?? null);
	let playlistIndex = $derived(data.playlistIndex ?? 0);

	// Extract video ID for keying components
	let videoId = $derived(data.videoId);

	// Computed states
	let hasError = $derived(!!error);
	let hasValidManifest = $derived(!!playerConfig.manifestUrl);

	let isPlaylist = $derived(!!playlistId);

	let playlistVideos = $derived(data.playlistVideos ?? null);
	let playlistInfo = $derived(data.playlistInfo ?? null);

	// Delay player initialisation until mounted (for Shaka Player)
	let showPlayer = $state(false);
	onMount(() => {
		showPlayer = true;
	});

	// Mobile tab state - 'details' or 'related'
	let activeTab = $state<'details' | 'playlist' | 'related' | 'comments'>('details');
</script>

<div class="bg-primary w-full">
	{#if hasError || !hasValidManifest}
		<!-- Full-width centered error states -->
		<div class="flex min-h-screen items-center justify-center px-4">
			{#if hasError}
				<ErrorCard
					variant="error"
					title="Failed to Load Video"
					message={error}
					showRetry={true}
					onRetry={() => window.location.reload()}
				/>
			{:else}
				<ErrorCard
					variant="warning"
					title="No Streams Available"
					message="Unable to load DASH manifest for this video. The video may be unavailable or restricted."
					showRetry={true}
					onRetry={() => window.location.reload()}
				/>
			{/if}
		</div>
	{:else}
		<!-- Desktop Layout (lg and above) - Two columns -->
		<div class="min-h-screen lg:mt-4 lg:grid lg:grid-cols-[2fr_1fr] lg:items-start">
			<div class="w-full lg:col-start-1 lg:row-start-1 lg:px-8 lg:pt-8">
				{#if showPlayer}
					<VideoPlayer config={playerConfig} />
				{/if}
			</div>

			<!-- Desktop: details + comments under the player -->
			<section class="hidden lg:col-start-1 lg:row-start-2 lg:block lg:px-8 lg:pb-8">
				{#key videoId}
					<VideoDetail {metadata} />

					{#if comments.length > 0}
						<div class="mt-6">
							<h2 class="mb-4 text-lg font-semibold">{comments.length} Comments</h2>
							<div class="divide-y divide-gray-200 dark:divide-gray-700">
								{#each comments as comment (comment.id)}
									<Comments {comment} />
								{/each}
							</div>
						</div>
					{/if}
				{/key}
			</section>

			<!-- Desktop: sidebar spanning both rows -->
			<aside
				class="hidden lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-7.75 lg:flex lg:flex-col lg:gap-5 lg:px-6"
			>
				{#if isPlaylist}
					<PlaylistQueue
						videos={playlistVideos ?? []}
						playlistName={playlistInfo?.name ?? ''}
						playlistId={playlistId ?? ''}
						currentIndex={playlistIndex ?? 0}
					/>
				{/if}
				<RelatedItemListings items={relatedItems} />
			</aside>

			<!-- Mobile/Tablet: content tabs below the player -->
			<div class="lg:hidden">
				<!-- Tab Navigation -->
				<div class="bg-navbar border-default sticky top-14 z-30 border-b">
					<div class="flex">
						<button
							class="relative flex-1 py-3 text-sm font-medium transition-colors
								{activeTab === 'details' ? 'text-primary' : 'text-secondary hover:text-primary'}"
							onclick={() => (activeTab = 'details')}
						>
							Details
							{#if activeTab === 'details'}
								<div class="bg-accent absolute right-0 bottom-0 left-0 h-0.5"></div>
							{/if}
						</button>

						{#if isPlaylist}
							<button
								class="relative flex-1 py-3 text-sm font-medium transition-colors
									{activeTab === 'playlist' ? 'text-primary' : 'text-secondary hover:text-primary'}"
								onclick={() => (activeTab = 'playlist')}
							>
								Playlist
								{#if activeTab === 'playlist'}
									<div class="bg-accent absolute right-0 bottom-0 left-0 h-0.5"></div>
								{/if}
							</button>
						{/if}

						<button
							class="relative flex-1 py-3 text-sm font-medium transition-colors
								{activeTab === 'related' ? 'text-primary' : 'text-secondary hover:text-primary'}"
							onclick={() => (activeTab = 'related')}
						>
							Related Videos
							{#if activeTab === 'related'}
								<div class="bg-accent absolute right-0 bottom-0 left-0 h-0.5"></div>
							{/if}
						</button>

						<button
							class="relative flex-1 py-3 text-sm font-medium transition-colors
								{activeTab === 'comments' ? 'text-primary' : 'text-secondary hover:text-primary'}"
							onclick={() => (activeTab = 'comments')}
						>
							Comments
							{#if activeTab === 'comments'}
								<div class="bg-accent absolute right-0 bottom-0 left-0 h-0.5"></div>
							{/if}
						</button>
					</div>
				</div>

				<!-- Tab Content -->
				<div class="p-4">
					{#if activeTab === 'details'}
						{#key videoId}
							<VideoDetail {metadata} />
						{/key}
					{:else if activeTab === 'playlist' && isPlaylist}
						<PlaylistQueue
							videos={playlistVideos ?? []}
							playlistId={playlistId ?? ''}
							currentIndex={playlistIndex}
						/>
					{:else if activeTab === 'related'}
						<RelatedItemListings items={relatedItems} />
					{:else if comments.length > 0}
						<div class="mt-6">
							<h2 class="mb-4 text-lg font-semibold">{comments.length} Comments</h2>
							<div class="divide-y divide-gray-200 dark:divide-gray-700">
								{#each comments as comment (comment.id)}
									<Comments {comment} />
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>
