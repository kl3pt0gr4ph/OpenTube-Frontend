<script lang="ts">
	import { formatDuration } from '#lib/utils/formatters.js';

	interface Props {
		src: string;
		alt?: string;
		duration?: number;
		portrait?: boolean;
	}

	let { src, alt = '', duration = 0, portrait = false }: Props = $props();
</script>

<div class="relative w-full overflow-hidden rounded-lg {portrait ? 'aspect-9/16' : 'aspect-video'}">
	<img
		{src}
		{alt}
		loading="lazy"
		decoding="async"
		class="size-full rounded-lg object-cover transition-transform group-hover:scale-105"
	/>
	{#if duration > 0}
		<span
			class="bg-opacity-80 absolute right-1 bottom-1 rounded bg-black px-1 py-0.5 text-xs text-white"
		>
			{formatDuration(duration)}
		</span>
	{/if}
</div>
