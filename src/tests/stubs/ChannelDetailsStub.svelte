<script lang="ts">
	import type { Snippet } from 'svelte';

	// Passthrough stub for ChannelDetails used in +page.svelte tests. Renders
	// the active tab's snippet so the page's snippet body (and the deriveds it
	// reads) executes, without pulling in the real ChannelDetails dependency
	// tree. One button per tab lets a test switch tabs.
	// activeTab is $bindable because the page uses bind:activeTab.
	let {
		tabs = ['videos'],
		activeTab = $bindable('videos'),
		tabContent
	}: {
		// channel?: unknown;
		tabs?: string[];
		activeTab?: string;
		tabContent?: Snippet<[string]>;
	} = $props();
</script>

<div data-testid="channel-details-stub" data-active-tab={activeTab}>
	{#each tabs as tab (tab)}
		<button type="button" onclick={() => (activeTab = tab)}>{tab}</button>
	{/each}
	{@render tabContent?.(activeTab)}
</div>