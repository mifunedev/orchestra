// White-label branding shape + defaults.
//
// Mirrors the backend `Branding` model served at GET /api/config/public.
// DEFAULT_BRANDING is the baked-in fallback used before the runtime config
// is fetched (and if the endpoint is unavailable), so the UI never renders
// an empty brand.

export interface Branding {
	brand: {
		name: string;
		title: string;
		short_name: string;
		copyright_holder: string;
		logo_url: string;
	};
	urls: {
		console: string;
		api_base: string;
		docs: string;
		website: string;
		blog: string;
		socials: string;
		github: string;
		slack_invite: string;
	};
	contact: {
		name: string;
		email: string;
	};
}

export const DEFAULT_BRANDING: Branding = {
	brand: {
		name: "Mifune",
		title: "Mifune - Orchestra 🪶",
		short_name: "Mifune",
		copyright_holder: "Mifune",
		logo_url: "",
	},
	urls: {
		console: "http://localhost:8000",
		api_base: "http://localhost:8000/api",
		docs: "https://github.com/mifunedev/orchestra/tree/development/docs",
		website: "https://mifune.dev",
		blog: "https://mifune.dev/blog",
		socials: "https://mifune.dev/socials",
		github: "https://github.com/mifunedev",
		slack_invite: "",
	},
	contact: {
		name: "Ryan Eggleston",
		email: "reggleston@mifune.dev",
	},
};
