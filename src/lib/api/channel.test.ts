import { describeJsonFetcher } from '../../tests/helpers/describeJsonFetcher';
import { getChannelInfo, getChannelVideos, getChannelVideosNextPage } from '#lib/api/channel.js';
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
