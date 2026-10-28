<script lang="ts">
	let { label = 'Loading…' }: { label?: string } = $props();
</script>

<div
	class="flex min-h-[60vh] w-full flex-col items-center justify-center gap-4 px-4"
	role="status"
	aria-busy="true"
	aria-live="polite"
>
	<div
		class="h-24 w-24 animate-spin rounded-full border-6 border-white/10 border-t-[#ff0000]"
		aria-hidden="true"
	></div>
	<p class="text-secondary text-sm">{label}</p>
</div>
