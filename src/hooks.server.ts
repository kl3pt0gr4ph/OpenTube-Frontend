import type { Handle } from '@sveltejs/kit/hooks';

export const handle: Handle = async ({ event, resolve }): Promise<Response> => {
	return resolve(event, {
		filterSerializedResponseHeaders: (name: string) => {
			return name === 'x-stream-type' || name === 'content-type';
		}
	});
};
