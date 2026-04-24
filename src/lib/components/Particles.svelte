<script>
	import { theme } from '$lib/stores/theme.svelte.js';
	import { onMount } from 'svelte';

	let canvas = $state(null);
	let ctx = $state(null);
	let particles = [];
	let ptColor = 'rgba(235, 208, 113, 0.15)';
	let animId;

	onMount(() => {
		if (!canvas) return;
		ctx = canvas.getContext('2d');
		resize();

		for (let i = 0; i < 40; i++) {
			particles.push({
				x: Math.random() * canvas.width,
				y: Math.random() * canvas.height,
				vx: (Math.random() - 0.5) * 0.4,
				vy: (Math.random() - 0.5) * 0.4,
				size: Math.random() * 1.5 + 0.5
			});
		}

		updateColor();
		animId = requestAnimationFrame(animate);

		window.addEventListener('resize', resize);
		return () => {
			window.removeEventListener('resize', resize);
			if (animId) cancelAnimationFrame(animId);
		};
	});

	function resize() {
		if (!canvas) return;
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
	}

	function updateColor() {
		const style = getComputedStyle(document.body);
		ptColor = style.getPropertyValue('--particle-color').trim() || 'rgba(100,100,100,0.2)';
	}

	function animate() {
		if (!ctx || !canvas) return;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.fillStyle = ptColor;
		ctx.beginPath();

		for (const p of particles) {
			p.x += p.vx;
			p.y += p.vy;
			if (p.x < 0) p.x = canvas.width;
			if (p.x > canvas.width) p.x = 0;
			if (p.y < 0) p.y = canvas.height;
			if (p.y > canvas.height) p.y = 0;
			ctx.moveTo(p.x, p.y);
			ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
		}

		ctx.fill();
		animId = requestAnimationFrame(animate);
	}

	// Re-read color when theme changes
	$effect(() => {
		// Access theme.current to track it
		const _ = theme.current;
		if (typeof document !== 'undefined') {
			setTimeout(updateColor, 50);
		}
	});
</script>

<canvas bind:this={canvas} class="particles-canvas"></canvas>

<style>
	.particles-canvas {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		z-index: -1;
		pointer-events: none;
	}
</style>
