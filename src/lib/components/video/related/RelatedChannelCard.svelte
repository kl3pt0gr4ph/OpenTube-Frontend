<script lang="ts">
	import avatarPlaceholder from '#lib/assets/placeholders/logofallback.svg';
	import { formatCount } from '#lib/utils/formatters.js';
	import { resolve } from '$app/paths';
	import type { RelatedChannelConfig } from '#lib/adapters/related.js';

	let { channel }: { channel: RelatedChannelConfig } = $props();

	let avatar = $derived(channel.avatar || avatarPlaceholder);

	function handleAvatarError(e: Event) {
		(e.currentTarget as HTMLImageElement).src = avatarPlaceholder;
	}
</script>

<div
	class="group hover:bg-secondary relative mx-2 flex items-center gap-2 rounded-lg p-2 transition-colors"
>
	<a
		href={resolve('/channel/[channelId]', { channelId: channel.id })}
		class="absolute inset-0 rounded-lg"
		aria-label={channel.name}
	></a>

	<div class="flex w-40 shrink-0 items-center justify-center">
		<img
			src={avatar}
			alt=""
			class="h-20 w-20 rounded-full object-cover"
			onerror={handleAvatarError}
		/>
	</div>

	<div class="flex min-w-0 flex-1 flex-col">
		<h3
			class="text-primary group-hover:text-accent line-clamp-2 text-sm font-semibold transition-colors"
		>
			{channel.name}
			{#if channel.verified}
				<span class="text-muted ml-1 text-xs" title="Verified">✓</span>
			{/if}
		</h3>

		{#if channel.subscriberCount > 0}
			<p class="text-muted mt-1 text-xs">{formatCount(channel.subscriberCount)} subscribers</p>
		{/if}
	</div>
</div>
