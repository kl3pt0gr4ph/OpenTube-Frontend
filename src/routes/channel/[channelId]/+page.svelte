<script lang="ts">
	import type { PageData } from './$types';
	import ChannelDetails from '#lib/components/channel/ChannelDetails.svelte';
	import ErrorCard from '#lib/components/ErrorCard.svelte';
	import type { ChannelTab } from '#lib/components/channel/ChannelDetails.svelte';
	import ChannelVideos from '#lib/components/channel/ChannelVideos.svelte';
	import type { NextPage } from '#lib/api/types.js';
	import { adaptChannelVideos, type ChannelVideoConfig } from '#lib/adapters/channel.js';
	import { getChannelVideosNextPage } from '#lib/api/channel.js';
	import thumbnailPlaceholder from '#lib/assets/placeholders/thumbnailFallback.svg?raw';
	import avatarPlaceholder from '#lib/assets/placeholders/logofallback.svg?raw';
	import playlistIcon from '#lib/assets/icons/playlist.svg?raw';

	let { data }: { data: PageData } = $props();

	let channel = $derived(
		data.channel ?? {
			id: '',
			name: '',
			handle: '',
			avatarUrl: null,
			bannerUrl: null,
			description: null,
			subscriberCount: '0',
			videoCount: 0,
			verified: false
		}
	);

	let channelVideos = $derived<ChannelVideoConfig[]>(data.videos ?? []);
	let nextPage = $derived<NextPage | null>(data.nextPage ?? null);
	let loadingMore = $state(false);
	let loadMoreError = $state<string | null>(null);

	let error = $derived(data.error ?? null);
	let activeTab = $state<ChannelTab>('videos');

	$effect(() => {
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		data;
		loadMoreError = null;
	});

	async function loadMore(): Promise<void> {
		if (!nextPage || loadingMore) return;

		loadingMore = true;
		loadMoreError = null;

		try {
			const nextPageData = await getChannelVideosNextPage(
				channel.id,
				channel.name,
				nextPage.url ?? '',
				nextPage.body ?? '',
				channel.verified ? 'VERIFIED' : 'UNVERIFIED'
			);
			const adapted = adaptChannelVideos(nextPageData, thumbnailPlaceholder, avatarPlaceholder);
			channelVideos = [...channelVideos, ...adapted.items];
			nextPage = adapted.nextPage ?? null;
		} catch (err) {
			loadMoreError = err instanceof Error ? err.message : 'Failed to load more channel videos';
		} finally {
			loadingMore = false;
		}
	}
</script>

<div class="bg-primary min-h-screen w-full">
	{#if error && !channel.name}
		<!-- Full-page error if we couldn't load anything meaningful -->
		<div class="flex min-h-screen items-center justify-center px-4">
			<ErrorCard
				variant="error"
				title="Failed to Load Channel"
				message={error}
				showRetry={true}
				onRetry={() => window.location.reload()}
			/>
		</div>
	{:else}
		<ChannelDetails {channel} bind:activeTab>
			{#snippet videos()}
				<ChannelVideos videos={channelVideos} />

				<div class="mt-8 px-4 pb-8 text-center">
					{#if loadMoreError}
						<p class="mb-3 text-sm text-red-500">{loadMoreError}</p>
					{/if}

					{#if nextPage}
						<button
							type="button"
							class="btn-primary rounded px-4 py-2 text-sm disabled:opacity-50"
							onclick={loadMore}
							disabled={loadingMore}
						>
							{#if channelVideos.length !== 0}
								{loadingMore ? 'Loading…' : 'Load more'}
							{/if}
						</button>
					{/if}
				</div>
			{/snippet}

			{#snippet playlists()}
				<div class="flex flex-col items-center justify-center px-6 py-12 text-center">
					<span class="text-muted mb-4 inline-block h-10 w-10">
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						{@html playlistIcon}
					</span>
					<p class="text-secondary text-sm">Playlists coming soon</p>
				</div>
			{/snippet}
		</ChannelDetails>
	{/if}
</div>
