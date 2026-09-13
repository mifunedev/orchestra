import { TOKEN_NAME } from "@/lib/config";

export function getAuthToken(token: string = TOKEN_NAME): string | null {
	try {
		if (typeof window === "undefined") return null;
		return window.localStorage.getItem(token) ?? null;
	} catch {
		// no-op
	}

	return null;
}

export function logout() {
	window.localStorage.removeItem(TOKEN_NAME);
	window.localStorage.removeItem("orchestra:checkbox:pii_analyze");
	window.localStorage.removeItem("orchestra:checkbox:pii_anonymize");
	return true;
}
