import { describe, it, expect } from 'vitest';
import { describeJsonFetcher } from '../../tests/helpers/describeJsonFetcher';
import {
	getChannelInfo,
	getChannelTab,
	getChannelTabNextPage,
	getChannelVideos,
	getChannelVideosNextPage
} from '#lib/api/channel.ts';
import { createSuccessfulFetch, extractQueryParams } from '../../tests/helpers/apiHelpers.ts';
import channelDetailsApiResponseFixture from '../../tests/fixtures/api/channelDetailsApiResponse.json';
import channelVideosApiResponseFixture from '../../tests/fixtures/api/channelVideosApiResponse.json';

describeJsonFetcher({
	name: 'getChannelInfo',
	call: getChannelInfo,
	endpoint: '/channels',
	idParam: 'id',
	fixture: channelDetailsApiResponseFixture
});

describeJsonFetcher({
	name: 'getChannelVideos',
	call: getChannelVideos,
	endpoint: '/channels/tab',
	idParam: 'id',
	fixture: channelVideosApiResponseFixture
});

describeJsonFetcher({
	name: 'getChannelVideosNextPage',
	call: (channelId: string, fetchFn) =>
		getChannelVideosNextPage(
			channelId,
			'GLITCH',
			'https://www.youtube.com/youtubei/v1/browse?prettyPrint=false',
			'EqADEgNsdHQamANTQ2lDQVF0TVdVMTJTbGMxY2xsTlJZSUJDMjlsY1ZWSVJYQTB',
			'VERIFIED',
			fetchFn
		),
	endpoint: '/channels/tab/page',
	idParam: 'channelId',
	fixture: channelDetailsApiResponseFixture
});

describeJsonFetcher({
	name: 'getChannelTab',
	call: (channelId: string, fetchFn) => getChannelTab(channelId, 'playlists', fetchFn),
	endpoint: '/channels/tab',
	idParam: 'id',
	fixture: channelVideosApiResponseFixture
});

describeJsonFetcher({
	name: 'getChannelTabNextPage',
	call: (channelId: string, fetchFn) =>
		getChannelTabNextPage(
			channelId,
			'playlists',
			channelVideosApiResponseFixture.nextPage,
			fetchFn
		),
	endpoint: '/channels/tab/page',
	idParam: 'channelId',
	fixture: channelVideosApiResponseFixture
});

describe('channel tab requests', () => {
	it('getChannelTab asks for the requested tab', async () => {
		const fetchFn = createSuccessfulFetch(channelVideosApiResponseFixture);

		await getChannelTab('UCtest456', 'shorts', fetchFn as never);

		expect(extractQueryParams(fetchFn.mock.calls[0][0] as string).tab).toBe('shorts');
	});

	it('getChannelTabNextPage passes to cursor back unmodified', async () => {
		const { nextPage } = channelVideosApiResponseFixture;
		const fetchFn = createSuccessfulFetch(channelVideosApiResponseFixture);

		await getChannelTabNextPage('UCtest456', 'albums', nextPage, fetchFn as never);

		const params = new URL(fetchFn.mock.calls[0][0] as string).searchParams;
		expect(params.get('tab')).toBe('albums');
		expect(params.get('pageUrl')).toBe(nextPage.url);
		expect(params.get('pageBody')).toBe(nextPage.body);
		expect(params.getAll('pageIds')).toEqual(nextPage.ids);
	})
});
