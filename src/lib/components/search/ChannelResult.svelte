<script lang="ts">
	import { formatCount } from '#lib/utils/formatters.js';
	import avatarPlaceholder from '#lib/assets/placeholders/logofallback.svg';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { ChannelSearchResultConfig } from '#lib/adapters/search.js';

	let { result }: { result: ChannelSearchResultConfig } = $props();

	let avatar = $derived(result.avatar || avatarPlaceholder);

	const redirectToChannel = () => goto(resolve('/channel/[channelId]', { channelId: result.id }));
	function handleKey(event: KeyboardEvent) {
		if (event.key === 'Enter') redirectToChannel();
	}
</script>

<div>
	<!-- Desktop -->
	<div
		class="hover:bg-secondary hidden items-center gap-6 rounded-lg p-4 shadow-sm transition-colors sm:flex"
	>
		<div
			role="button"
			tabindex="0"
			onclick={redirectToChannel}
			onkeydown={handleKey}
			class="shrink-0 cursor-pointer"
		>
			<img src={avatar} alt={result.name} class="h-24 w-24 rounded-full object-cover" />
		</div>
		<div class="flex flex-col">
			<div
				role="button"
				tabindex="0"
				onclick={redirectToChannel}
				onkeydown={handleKey}
				class="cursor-pointer hover:underline"
			>
				<h3 class="text-primary text-lg font-semibold">
					{result.name}
					{#if result.verified}
						<span class="text-muted ml-1" title="Verified">✓</span>
					{/if}
				</h3>
			</div>
			{#if result.subscriberCount > 0}
				<p class="text-muted text-sm">{formatCount(result.subscriberCount)} subscribers</p>
			{/if}
			{#if result.description}
				<p class="text-secondary mt-2 line-clamp-2 text-sm">{result.description}</p>
			{/if}
		</div>
	</div>

	<!-- Mobile -->
	<div
		role="button"
		tabindex="0"
		onclick={redirectToChannel}
		onkeydown={handleKey}
		class="hover:bg-secondary flex cursor-pointer items-center gap-4 rounded-lg p-3 shadow-sm transition-colors sm:hidden"
	>
		<img src={avatar} alt={result.name} class="h-16 w-16 shrink-0 rounded-full object-cover" />
		<div class="flex flex-col">
			<h3 class="text-primary text-base font-semibold">
				{result.name}
				{#if result.verified}
					<span class="text-muted ml-1 text-xs" title="Verified">✓</span>
				{/if}
			</h3>
			{#if result.subscriberCount > 0}
				<p class="text-muted text-xs">{formatCount(result.subscriberCount)} subscribers</p>
			{/if}
		</div>
	</div>
</div>
