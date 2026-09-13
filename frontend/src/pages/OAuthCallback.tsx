import { useEffect, useRef } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { FaGithub, FaGoogle } from "react-icons/fa";
import { VITE_API_URL, TOKEN_NAME } from "@/lib/config";
import { jwtDecode } from "jwt-decode";
import AgentService from "@/lib/services/agentService";

const OAuthCallback = () => {
	const location = useLocation();
	const params = useParams();
	const navigate = useNavigate();
	const provider = params.provider as string; // Extract provider from dynamic route
	const hasFetched = useRef(false);

	// Parse code from URL search params
	const searchParams = new URLSearchParams(location.search);
	const code = searchParams.get("code");

	useEffect(() => {
		const getOauthAccessToken = async (provider: string, code: string) => {
			try {
				// Using the query parameter approach as shown in your first implementation
				const response = await fetch(
					`${VITE_API_URL}/auth/${provider}/callback?code=${code}`,
					{
						method: "GET",
						headers: {
							"Content-Type": "application/json",
						},
					},
				);

				if (!response.ok) {
					throw new Error(response.statusText);
				}

				const data = await response.json();
				const accessToken = data.access_token;

				// Store token
				localStorage.setItem(TOKEN_NAME, accessToken);

				// Fetch user data if needed
				try {
					const userDataResponse = await fetch(`${VITE_API_URL}/auth/user`, {
						headers: {
							Authorization: `Bearer ${accessToken}`,
						},
					});

					if (userDataResponse.ok) {
						const userData = await userDataResponse.json();
						// You might want to store user data in localStorage or state management
						localStorage.setItem("user", JSON.stringify(userData.user));

						// Set token expiration timeout if using JWT
						try {
							const decodedToken = jwtDecode<{ exp: number }>(accessToken);
							const expirationTime = decodedToken.exp * 1000 - Date.now();

							// Set timeout to clear token when it expires
							setTimeout(() => {
								localStorage.removeItem(TOKEN_NAME);
								localStorage.removeItem("user");
								navigate("/login");
							}, expirationTime);
						} catch (error) {
							console.error("Error decoding token:", error);
						}
					}
				} catch (error) {
					console.error("Error fetching user data:", error);
				}

				// Auto-fork if remix param was stored before OAuth redirect
				const remixAgentId = localStorage.getItem("orchestra:remix_agent_id");
				if (remixAgentId) {
					localStorage.removeItem("orchestra:remix_agent_id");
					try {
						const forkRes = await AgentService.fork(remixAgentId);
						navigate(`/assistant/${forkRes.data.assistant_id}`);
						return;
					} catch {
						// Fork failed — still proceed to chat
					}
				}
				navigate("/chat");
			} catch (error) {
				console.error("OAuth authentication failed:", error);
				navigate("/login?error=authentication_failed");
			}
		};

		if (code && provider && !hasFetched.current) {
			getOauthAccessToken(provider, code);
			hasFetched.current = true;
		}
	}, [code, provider, navigate]);

	return (
		<main
			className="flex min-h-screen flex-col"
			style={{ position: "relative" }}
		>
			<div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-8">
				<div className="text-center sm:mx-auto sm:w-full sm:max-w-md">
					{provider === "google" && (
						<>
							<FaGoogle className="mx-auto text-8xl" />
							<span>Authenticating with Google</span>
							<span className="ellipsis text-2xl">...</span>
						</>
					)}
					{provider === "github" && (
						<>
							<FaGithub className="mx-auto text-8xl" />
							<span>Authenticating with GitHub</span>
							<span className="ellipsis text-2xl">...</span>
						</>
					)}
				</div>
			</div>
		</main>
	);
};

export default OAuthCallback;
