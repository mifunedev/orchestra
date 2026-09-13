// MUST stay the first import: this module runs the legacy-key storage
// migrations at module-evaluation time, and ES modules evaluate depth-first in
// import order, so nothing below can read a storage key before it has moved.
import { runStorageMigrations } from "./lib/utils/storageMigrations";
import "./styles/globals.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppRoutes } from "./routes";
import ChatProvider from "./context/ChatContext";
import AgentProvider from "./context/AgentContext";
import ProjectProvider from "./context/ProjectContext";
import ThemeProvider from "./context/ThemeContext";
import AppProvider from "./context/AppContext";
import BrandingProvider from "./context/BrandingContext";
import { PromptProvider } from "./context/PromptContext";
import { OnboardingProvider } from "./context/OnboardingContext";
import { NuqsAdapter } from "nuqs/adapters/react";
import { QueryProvider } from "./providers/QueryProvider";
import { Toaster } from "./components/ui/sonner";

// Idempotent re-run: keeps the import above from being dropped as unused and
// covers any module that was evaluated outside this entrypoint's import graph.
runStorageMigrations();

// Register service worker
if ("serviceWorker" in navigator && import.meta.env.MODE === "production") {
	navigator.serviceWorker
		.register(
			import.meta.env.MODE === "production" ? "/sw.js" : "/dev-sw.js?dev-sw",
			{ type: import.meta.env.MODE === "production" ? "classic" : "module" },
		)
		.then((registration) => {
			console.log("Service worker registered successfully:", registration);
		})
		.catch((error) => {
			console.error("Service worker registration failed:", error);
		});
}

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
			<QueryProvider>
				<NuqsAdapter>
					<BrandingProvider>
						<AppProvider>
							<AgentProvider>
								<ProjectProvider>
									<PromptProvider>
										<ChatProvider>
											<OnboardingProvider>
												<AppRoutes />
											</OnboardingProvider>
										</ChatProvider>
									</PromptProvider>
								</ProjectProvider>
							</AgentProvider>
						</AppProvider>
					</BrandingProvider>
				</NuqsAdapter>
			</QueryProvider>
			{/*
			  Mounted here rather than in App.tsx: App is the element for
			  <Route path="/">, so toast coverage would depend on route nesting.
			  Toaster only needs ThemeProvider. top-center because every bottom
			  position collides with the bottom-anchored chat composer.
			  The embed root (embed/main.tsx) is deliberately excluded — it is a
			  shadow-DOM root and sonner portals to document.body.
			*/}
			<Toaster
				position="top-center"
				offset="16px"
				visibleToasts={3}
				closeButton
				containerAriaLabel="Notifications"
			/>
		</ThemeProvider>
	</StrictMode>,
);
