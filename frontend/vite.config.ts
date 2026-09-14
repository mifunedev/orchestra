import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA, VitePWAOptions } from "vite-plugin-pwa";

const proxyTarget = process.env.VITE_PROXY_TARGET || "http://localhost:8000";

const MANIFEST: Partial<VitePWAOptions> = {
	registerType: "autoUpdate",
	strategies: "generateSW",
	includeAssets: ["favicon.ico", "icons/*.png"],
	injectRegister: null,
	// ↑ you handle registration manually – keep it consistent
	workbox: {
		// OPTION A: raise the limit (10 MiB)
		maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,

		// OPTION B (recommended even with A): don't precache the heaviest libs;
		// they'll be loaded via normal requests and cached at runtime.
		// (Use either `exclude` at plugin root or `globIgnores` here)
		globIgnores: ["**/*monaco*.js", "**/*plotly*.js"],

		// Add a simple runtime caching rule for big JS
		runtimeCaching: [
			{
				urlPattern: ({ request }) => request.destination === "script",
				handler: "NetworkFirst",
				options: {
					cacheName: "js-runtime",
					expiration: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 },
				},
			},
		],
	},
	manifest: {
		name: "Mifune",
		short_name: "Mifune",
		description: "Mifune",
		theme_color: "#000000",
		background_color: "#000000",
		display: "standalone",
		scope: "/",
		start_url: "/",
		orientation: "portrait",
		categories: ["education", "productivity"],
		icons: [
			{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
			{ src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
		],
	},
	// In dev, consider disabling the SW to avoid cache confusion:
	// devOptions: { enabled: false }
};

export default defineConfig({
	plugins: [react(), VitePWA(MANIFEST)],
	build: {
		outDir: "../backend/src/public",
		emptyOutDir: true,
		sourcemap: process.env.NODE_ENV === "development",
		chunkSizeWarningLimit: 1500, // (optional) calm Vite warnings; not related to Workbox

		rollupOptions: {
			output: {
				manualChunks(id) {
					// Core vendor chunk
					if (
						id.includes("node_modules/react/") ||
						id.includes("node_modules/react-dom/")
					) {
						return "vendor";
					}
					// Router chunk
					if (id.includes("node_modules/react-router")) {
						return "router";
					}
					// Monaco editor chunk
					if (
						id.includes("node_modules/@monaco-editor") ||
						id.includes("node_modules/monaco-editor")
					) {
						return "monaco";
					}
					// Plotly chunk (now using plotly.js-dist-min)
					if (
						id.includes("node_modules/plotly.js") ||
						id.includes("node_modules/react-plotly.js")
					) {
						return "plotly";
					}
					// UI components chunk
					if (id.includes("node_modules/@radix-ui")) {
						return "ui";
					}
					// Markdown/syntax highlighting chunk
					if (
						id.includes("node_modules/react-markdown") ||
						id.includes("node_modules/react-syntax-highlighter") ||
						id.includes("node_modules/prismjs") ||
						id.includes("node_modules/rehype") ||
						id.includes("node_modules/remark")
					) {
						return "markdown";
					}
				},
			},
		},
	},
	resolve: {
		alias: { "@": path.resolve(__dirname, "./src") },
	},
	server: {
		allowedHosts: ["orchestra.mifune.dev", "frontend.mifune.dev"],
		proxy: {
			"/api": {
				target: proxyTarget,
				changeOrigin: true,
			},
		},
	},
});
