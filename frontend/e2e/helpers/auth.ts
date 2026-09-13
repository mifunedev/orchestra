import { Page } from "@playwright/test";

const API_URL = "http://localhost:8000";
const TOKEN_KEY = "orchestra:auth:token";

/**
 * Log in as the seeded admin user and inject the token into localStorage so
 * the React app's auth guard passes on the next navigation.
 *
 * Must be called BEFORE navigating to any protected page.
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  // Obtain a token from the backend
  const response = await page.request.post(`${API_URL}/api/auth/login`, {
    data: { email: "admin@example.com", password: "test1234" },
  });

  const body = await response.json();
  const token: string = body.access_token;

  // Seed localStorage before the app boots (navigate to the origin first so
  // localStorage is accessible, then set the key).
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ([key, value]) => {
      localStorage.setItem(key, value);
    },
    [TOKEN_KEY, token],
  );
}
