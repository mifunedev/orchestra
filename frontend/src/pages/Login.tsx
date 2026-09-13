import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import NoAuthLayout from "../layouts/NoAuthLayout";
import { TOKEN_NAME, VITE_API_URL } from "../lib/config";
import { ColorModeButton } from "@/components/buttons/ColorModeButton";
import HelpfulIcons from "@/components/icons/HelpfulIcons";
import { SiGoogle, SiGithub } from "react-icons/si";
import { FaMicrosoft } from "react-icons/fa";
import { AlertTriangle } from "lucide-react";
import AgentService from "@/lib/services/agentService";

export default function Login() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const remixAgentId = searchParams.get("remix");

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError("");

		try {
			const response = await fetch(`${VITE_API_URL}/auth/login`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					email,
					password,
				}),
			});

			if (response.ok) {
				const data = await response.json();
				// Store JWT token in localStorage
				localStorage.setItem(TOKEN_NAME, data.access_token);
				localStorage.setItem("orchestra:auth:user", JSON.stringify(data.user));

				// Auto-fork if remix param is present
				if (remixAgentId) {
					try {
						const forkRes = await AgentService.fork(remixAgentId);
						navigate(`/assistant/${forkRes.data.assistant_id}`);
						return;
					} catch {
						// Fork failed — still proceed to chat
					}
				}
				navigate("/chat");
			} else {
				const errorData = await response.json();
				setError(errorData.detail || "Invalid credentials");
			}
		} catch {
			setError("Failed to connect to server");
		} finally {
			setIsLoading(false);
		}
	};

	const handleOAuthLogin = async (provider: string) => {
		try {
			// Persist remix param across OAuth redirect
			if (remixAgentId) {
				localStorage.setItem("orchestra:remix_agent_id", remixAgentId);
			}
			const res = await fetch(`${VITE_API_URL}/auth/${provider}`, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			});
			const data = await res.json();
			window.location.href = data.url;
		} catch (error) {
			console.error("Error:", error);
			alert("Error: " + error);
		}
	};

	return (
		<NoAuthLayout>
			<main className="mt-[10vh] flex flex-col items-center justify-center bg-background">
				<div className="absolute top-4 right-4">
					<ColorModeButton />
				</div>

				<div className="w-full max-w-md space-y-8 p-8 bg-card rounded-lg shadow-md border border-border">
					<div className="text-center">
						<img
							src="https://avatars.githubusercontent.com/u/139279732?s=200&v=4"
							alt="Logo"
							className="w-20 h-20 mx-auto rounded-full"
						/>
						<h1 className="text-3xl font-bold text-foreground">Login</h1>
						<p className="mt-2 text-sm text-muted-foreground">
							Sign in to your account
						</p>
					</div>

					<form onSubmit={handleLogin} className="mt-8 space-y-6">
						{error && (
							<div className="flex items-start gap-2 border border-destructive-accent/70 bg-destructive/10 text-foreground p-3 rounded-md text-sm">
								<AlertTriangle
									aria-hidden="true"
									className="h-4 w-4 mt-0.5 shrink-0 text-destructive-accent"
								/>
								<span className="flex-1">{error}</span>
							</div>
						)}

						<div className="space-y-4">
							<div>
								<label
									htmlFor="email"
									className="block text-sm font-medium text-foreground"
								>
									Email
								</label>
								<div className="relative">
									<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											className="h-5 w-5 text-muted-foreground"
											viewBox="0 0 20 20"
											fill="currentColor"
										>
											<path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
											<path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
										</svg>
									</div>
									<input
										id="email"
										type="email"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										className="mt-1 block w-full pl-10 px-3 py-2 bg-background border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
										placeholder="Enter your email"
										required
									/>
								</div>
							</div>

							<div>
								<label
									htmlFor="password"
									className="block text-sm font-medium text-foreground"
								>
									Password
								</label>
								<div className="relative">
									<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											className="h-5 w-5 text-muted-foreground"
											viewBox="0 0 20 20"
											fill="currentColor"
										>
											<path
												fillRule="evenodd"
												d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
												clipRule="evenodd"
											/>
										</svg>
									</div>
									<input
										id="password"
										type="password"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										className="mt-1 block w-full pl-10 px-3 py-2 bg-background border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
										placeholder="Enter your password"
										required
									/>
								</div>
							</div>
						</div>

						<button
							type="submit"
							disabled={isLoading}
							className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isLoading ? "Signing in..." : "Sign in"}
						</button>

						<div className="relative my-6">
							<div className="absolute inset-0 flex items-center">
								<div className="w-full border-t border-border"></div>
							</div>
							<div className="relative flex justify-center text-sm">
								<span className="px-2 bg-card text-muted-foreground">
									Or continue with
								</span>
							</div>
						</div>

						<div className="flex gap-4 justify-center">
							<button
								type="button"
								disabled={true}
								// onClick={() => handleOAuthLogin('google')
								onClick={() => alert("Coming soon!")}
								className="flex items-center justify-center w-full p-2 border border-input rounded-md hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								aria-label="Sign in with Google"
							>
								<SiGoogle className="h-5 w-5" />
							</button>
							<button
								type="button"
								onClick={() => handleOAuthLogin("github")}
								className="flex items-center justify-center w-full p-2 border border-input rounded-md hover:bg-accent transition-colors"
								aria-label="Sign in with GitHub"
							>
								<SiGithub className="h-5 w-5" />
							</button>
							<button
								type="button"
								disabled={true}
								// onClick={() => handleOAuthLogin('azure')}
								onClick={() => alert("Coming soon!")}
								className="flex items-center justify-center w-full p-2 border border-input rounded-md hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								aria-label="Sign in with Microsoft"
							>
								<FaMicrosoft className="h-5 w-5" />
							</button>
						</div>

						<div className="text-center">
							<span className="text-sm text-muted-foreground">
								Don't have an account?{" "}
								<a
									href={
										remixAgentId
											? `/register?remix=${remixAgentId}`
											: "/register"
									}
									className="font-medium text-primary hover:text-primary/90 transition-colors"
								>
									Register here
								</a>
							</span>
						</div>
					</form>
				</div>
				<HelpfulIcons />
			</main>
		</NoAuthLayout>
	);
}
