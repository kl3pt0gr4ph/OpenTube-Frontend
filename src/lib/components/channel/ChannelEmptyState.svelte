<script lang="ts">
	import videoCameraIcon from '#lib/assets/icons/videoCamera.svg?raw';
	import playlistIcon from '#lib/assets/icons/playlist.svg?raw';

	let { message, icon = 'video' }: { message: string; icon?: 'video' | 'playlist' } = $props();
</script>

<div class="flex flex-col items-center justify-center px-6 py-12 text-center">
	<span class="text-muted mb-4 inline-block h-10 w-10">
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html icon === 'playlist' ? playlistIcon : videoCameraIcon}
	</span>
	<p class="text-secondary text-sm">{message}</p>
</div>
