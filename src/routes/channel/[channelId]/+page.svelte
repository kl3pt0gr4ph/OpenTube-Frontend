<script lang="ts">
	import type { PageData } from './$types';
	import ChannelDetails from '#lib/components/channel/ChannelDetails.svelte';
	import ErrorCard from '#lib/components/ErrorCard.svelte';
	import Loading from '#lib/components/Loading.svelte';
	import type { ChannelTab } from '#lib/components/channel/ChannelDetails.svelte';
	import ChannelVideos from '#lib/components/channel/ChannelVideos.svelte';
	import ChannelPlaylists from '#lib/components/channel/ChannelPlaylists.svelte';
	import type { NextPage } from '#lib/api/types.ts';
	import {
		adaptChannelTab,
		type ChannelPlaylistConfig,
		type ChannelTabItemConfig,
		type ChannelTabPage,
		type ChannelVideoConfig
	} from '#lib/adapters/channel.js';
	import { getChannelTab, getChannelTabNextPage } from '#lib/api/channel.ts';
	import { uniqueBy } from '#lib/utils/uniqueBy.ts';
	import thumbnailPlaceholder from '#lib/assets/placeholders/thumbnailFallback.svg';
	import avatarPlaceholder from '#lib/assets/placeholders/logofallback.svg';

	interface TabState {
		items: ChannelTabItemConfig[];
		nextPage: NextPage | null;
		status: 'loading' | 'ready' | 'error';
		loadingMore: boolean;
		error: string | null;
	}

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

	let error = $derived(data.error ?? null);
	let tabs = $derived<ChannelTab[]>(data.tabs?.length ? data.tabs : ['videos']);
	let activeTab = $derived(tabs[0]);

	// The videos tab arrives with the page; every other tab is fetched the first
	// time it is opened. Being derived from `data`, this resets on a new channel.
	let tabStates = $derived<Partial<Record<ChannelTab, TabState>>>({
		videos: {
			items: data.videos ?? [],
			nextPage: data.nextPage ?? null,
			status: 'ready',
			loadingMore: false,
			error: null
		}
	});

	$effect(() => {
		if (!tabStates[activeTab]) void loadTab(activeTab);
	});

	const itemKey = (item: ChannelTabItemConfig): string => `${item.type}:${item.id}`;
	const isVideo = (item: ChannelTabItemConfig): item is ChannelVideoConfig => item.type === 'video';
	const isPlaylist = (item: ChannelTabItemConfig): item is ChannelPlaylistConfig =>
		item.type === 'playlist';

	function updateTab(tab: ChannelTab, changes: Partial<TabState>): void {
		const current: TabState = tabStates[tab] ?? {
			items: [],
			nextPage: null,
			status: 'loading',
			loadingMore: false,
			error: null
		};
		tabStates = { ...tabStates, [tab]: { ...current, ...changes } };
	}

	async function loadTab(tab: ChannelTab): Promise<void> {
		const channelId: string = channel.id;
		updateTab(tab, { status: 'loading', error: null });

		try {
			const page: ChannelTabPage = adaptChannelTab(
				await getChannelTab(channelId, tab),
				thumbnailPlaceholder,
				avatarPlaceholder
			);
			if (channel.id !== channelId) return;
			updateTab(tab, {
				items: uniqueBy(page.items, itemKey),
				nextPage: page.nextPage,
				status: 'ready'
			});
		} catch (err) {
			if (channel.id !== channelId) return;
			updateTab(tab, {
				status: 'error',
				error: err instanceof Error ? err.message : `Failed to load ${tab}`
			});
		}
	}

	async function loadMore(tab: ChannelTab): Promise<void> {
		const current: TabState | undefined = tabStates[tab];
		if (!current?.nextPage || current.loadingMore) return;

		const channelId: string = channel.id;
		updateTab(tab, { loadingMore: true, error: null });

		try {
			const page: ChannelTabPage = adaptChannelTab(
				await getChannelTabNextPage(channelId, tab, current.nextPage),
				thumbnailPlaceholder,
				avatarPlaceholder
			);
			if (channel.id !== channelId) return;
			updateTab(tab, {
				items: uniqueBy([...current.items, ...page.items], itemKey),
				nextPage: page.nextPage,
				loadingMore: false
			});
		} catch (err) {
			if (channel.id !== channelId) return;
			updateTab(tab, {
				loadingMore: false,
				error: err instanceof Error ? err.message : `Failed to load more ${tab}`
			});
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
		<ChannelDetails {channel} {tabs} bind:activeTab>
			{#snippet tabContent(tab: ChannelTab)}
				{@const current = tabStates[tab]}

				{#if !current || current.status === 'loading'}
					<Loading label={`Loading ${tab}…`} />
				{:else if current.status === 'error'}
					<div class="px-4 py-12 text-center">
						<p class="mb-3 text-sm text-red-500">{current.error}</p>
						<button
							type="button"
							class="btn-primary rounded px-4 py-2 text-sm"
							onclick={() => loadTab(tab)}
						>
							Try again
						</button>
					</div>
				{:else}
					{#if tab === 'playlists' || tab === 'albums'}
						<ChannelPlaylists playlists={current.items.filter(isPlaylist)} {tab} />
					{:else}
						<ChannelVideos videos={current.items.filter(isVideo)} {tab} />
					{/if}

					<div class="mt-8 px-4 pb-8 text-center">
						{#if current.error}
							<p class="mb-3 text-sm text-red-500">{current.error}</p>
						{/if}

						{#if current.nextPage && current.items.length > 0}
							<button
								type="button"
								class="btn-primary rounded px-4 py-2 text-sm disabled:opacity-50"
								onclick={() => loadMore(tab)}
								disabled={current.loadingMore}
							>
								{current.loadingMore ? 'Loading…' : 'Load more'}
							</button>
						{/if}
					</div>
				{/if}
			{/snippet}
		</ChannelDetails>
	{/if}
</div>
