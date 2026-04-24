<script>
	let { onLocal, onOnline } = $props();
</script>

<div class="lobby-menu" style="animation: introReveal 0.4s ease forwards;">
	<button class="btn filled main-btn" onclick={onLocal}>Play Local</button>
	<button class="btn tonal main-btn" onclick={onOnline}>Play Online</button>
</div>
