// webview-preload.js
window.addEventListener('click', (e) => {
	const target = e.target.closest('a');
	if (target && target.href) {
		// If it's a link, tell the webview to load it manually
		// This bypasses some SPA-logic hurdles
		window.location.href = target.href;
	}
}, true);