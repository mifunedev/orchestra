import { useState } from "react";
import { Plus, Server, Trash2, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tool, McpServerConfig } from "./types";
import { ToolGrid } from "./ToolGrid";

interface McpServerPanelProps {
	mcpServers: Record<string, McpServerConfig>;
	mcpTools: Tool[];
	selectedTools: Set<string>;
	onToggleSelection: (toolName: string) => void;
	onAddServer: (name: string, config: McpServerConfig) => void;
	onRemoveServer: (name: string) => void;
	onToggleServer: (name: string) => void;
	onTestConnection: (config: Record<string, McpServerConfig>) => Promise<void>;
	isLoading: boolean;
}

const MCP_TEMPLATES = {
	custom: {
		name: "Custom",
		transport: "sse" as const,
		url: "",
		headers: {},
	},
	mifune: {
		name: "Mifune MCP",
		transport: "sse" as const,
		url: "http://localhost:8000/mcp",
		headers: { "x-api-key": "" },
	},
	github: {
		name: "GitHub MCP",
		transport: "sse" as const,
		url: "https://mcp.github.com/sse",
		headers: { Authorization: "Bearer " },
	},
	exec: {
		name: "Exec Server",
		transport: "streamable_http" as const,
		url: "http://localhost:3005/mcp",
		headers: { "x-api-key": "" },
	},
};

export function McpServerPanel({
	mcpServers,
	mcpTools,
	selectedTools,
	onToggleSelection,
	onAddServer,
	onRemoveServer,
	onToggleServer,
	onTestConnection,
	isLoading,
}: McpServerPanelProps) {
	const [showAddForm, setShowAddForm] = useState(false);
	const [editingServer, setEditingServer] = useState<string | null>(null);
	const [serverName, setServerName] = useState("");
	const [selectedTemplate, setSelectedTemplate] =
		useState<keyof typeof MCP_TEMPLATES>("custom");
	const [transport, setTransport] = useState<
		"sse" | "streamable_http" | "stdio"
	>("sse");
	const [url, setUrl] = useState("");
	const [headerKey, setHeaderKey] = useState("");
	const [headerValue, setHeaderValue] = useState("");

	const handleTemplateChange = (template: keyof typeof MCP_TEMPLATES) => {
		setSelectedTemplate(template);
		const config = MCP_TEMPLATES[template];
		setTransport(config.transport);
		setUrl(config.url);

		// Set first header if exists
		const firstHeader = Object.entries(config.headers)[0];
		if (firstHeader) {
			setHeaderKey(firstHeader[0]);
			setHeaderValue(firstHeader[1]);
		} else {
			setHeaderKey("");
			setHeaderValue("");
		}
	};

	const handleAddServer = () => {
		if (!serverName.trim() || !url.trim()) return;

		const headers: Record<string, string> = {};
		if (headerKey.trim() && headerValue.trim()) {
			headers[headerKey.trim()] = headerValue.trim();
		}

		onAddServer(serverName.trim(), {
			transport,
			url: url.trim(),
			headers,
		});

		// Reset form
		setServerName("");
		setSelectedTemplate("custom");
		setTransport("sse");
		setUrl("");
		setHeaderKey("");
		setHeaderValue("");
		setEditingServer(null);
		setShowAddForm(false);
	};

	const handleEditServer = (name: string, config: McpServerConfig) => {
		setEditingServer(name);
		setServerName(name);
		setSelectedTemplate("custom");
		setTransport(config.transport);
		setUrl(config.url);

		const firstHeader = Object.entries(config.headers)[0];
		if (firstHeader) {
			setHeaderKey(firstHeader[0]);
			setHeaderValue(firstHeader[1]);
		} else {
			setHeaderKey("");
			setHeaderValue("");
		}

		setShowAddForm(true);
	};

	const handleTestConnection = async () => {
		await onTestConnection(mcpServers);
	};

	const serverCount = Object.keys(mcpServers).length;

	return (
		<div className="flex flex-col h-full">
			{/* Header */}
			<div className="flex-shrink-0 border-b border-border px-3 sm:px-4 lg:px-6 py-3 sm:py-4 space-y-4">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="text-lg sm:text-xl font-semibold text-foreground">
							MCP Servers
						</h2>
						<p className="text-sm text-muted-foreground">
							Configure Model Context Protocol servers
						</p>
					</div>
					<Button
						onClick={() => {
							setShowAddForm(!showAddForm);
							if (showAddForm) {
								setEditingServer(null);
								setServerName("");
								setSelectedTemplate("custom");
								setTransport("sse");
								setUrl("");
								setHeaderKey("");
								setHeaderValue("");
							}
						}}
						size="sm"
						variant={showAddForm ? "outline" : "default"}
					>
						<Plus className="h-4 w-4 mr-2" />
						{showAddForm ? "Cancel" : "Add Server"}
					</Button>
				</div>

				{/* Add Server Form */}
				{showAddForm && (
					<Card className="p-4 space-y-4">
						<div className="space-y-2">
							<Label htmlFor="template">Template</Label>
							<Select
								value={selectedTemplate}
								onValueChange={handleTemplateChange}
							>
								<SelectTrigger id="template">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{Object.entries(MCP_TEMPLATES).map(([key, template]) => (
										<SelectItem key={key} value={key}>
											{template.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="serverName">Server Name</Label>
								<Input
									id="serverName"
									placeholder="my_mcp_server"
									value={serverName}
									onChange={(e) => setServerName(e.target.value)}
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="transport">Transport</Label>
								<Select
									value={transport}
									onValueChange={(v: any) => setTransport(v)}
								>
									<SelectTrigger id="transport">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="sse">SSE</SelectItem>
										<SelectItem value="streamable_http">
											Streamable HTTP
										</SelectItem>
										<SelectItem value="stdio">STDIO</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="url">URL</Label>
							<Input
								id="url"
								placeholder="https://mcp.example.com/sse"
								value={url}
								onChange={(e) => setUrl(e.target.value)}
							/>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="headerKey">Header Key (optional)</Label>
								<Input
									id="headerKey"
									placeholder="x-api-key"
									value={headerKey}
									onChange={(e) => setHeaderKey(e.target.value)}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="headerValue">Header Value</Label>
								<Input
									id="headerValue"
									placeholder="your_api_key"
									type="password"
									value={headerValue}
									onChange={(e) => setHeaderValue(e.target.value)}
								/>
							</div>
						</div>

						<div className="flex justify-end gap-2">
							<Button
								variant="outline"
								onClick={() => {
									setShowAddForm(false);
									setEditingServer(null);
									setServerName("");
									setSelectedTemplate("custom");
									setTransport("sse");
									setUrl("");
									setHeaderKey("");
									setHeaderValue("");
								}}
							>
								Cancel
							</Button>
							<Button
								onClick={handleAddServer}
								disabled={!serverName.trim() || !url.trim()}
							>
								{editingServer ? "Save" : "Add Server"}
							</Button>
						</div>
					</Card>
				)}

				{/* Server List */}
				{serverCount > 0 && (
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<p className="text-sm font-medium text-foreground">
								Configured Servers ({serverCount})
							</p>
							<Button
								size="sm"
								variant="outline"
								onClick={handleTestConnection}
								disabled={isLoading}
							>
								{isLoading ? (
									<>
										<Loader2 className="h-4 w-4 mr-2 animate-spin" />
										Loading Tools...
									</>
								) : (
									<>
										<Server className="h-4 w-4 mr-2" />
										Fetch Tools
									</>
								)}
							</Button>
						</div>

						<div className="space-y-2">
							{Object.entries(mcpServers).map(([name, config]) => {
								const isEnabled = config.enabled !== false;
								return (
									<Card
										key={name}
										className={`p-3 transition-opacity ${!isEnabled ? "opacity-50" : ""}`}
									>
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-3">
												<Server className="h-4 w-4 text-muted-foreground" />
												<div>
													<p className="text-sm font-medium text-foreground">
														{name}
													</p>
													<p className="text-xs text-muted-foreground">
														{config.transport} • {config.url}
													</p>
												</div>
											</div>
											<div className="flex items-center gap-1">
												<Switch
													checked={isEnabled}
													onCheckedChange={() => onToggleServer(name)}
													aria-label={`Toggle ${name}`}
												/>
												<Button
													size="icon"
													variant="ghost"
													onClick={() => handleEditServer(name, config)}
												>
													<Pencil className="h-4 w-4 text-muted-foreground" />
												</Button>
												<Button
													size="icon"
													variant="ghost"
													onClick={() => onRemoveServer(name)}
												>
													<Trash2 className="h-4 w-4 text-destructive-accent" />
												</Button>
											</div>
										</div>
									</Card>
								);
							})}
						</div>
					</div>
				)}
			</div>

			{/* Tool Grid */}
			<div className="flex-1 overflow-hidden">
				{mcpTools.length > 0 ? (
					<ToolGrid
						tools={mcpTools}
						selectedTools={selectedTools}
						onToggleSelection={onToggleSelection}
					/>
				) : (
					<div className="flex items-center justify-center h-full">
						<div className="text-center space-y-2">
							<Server className="h-12 w-12 text-muted-foreground mx-auto" />
							<p className="text-muted-foreground">
								{serverCount === 0
									? "Add an MCP server to get started"
									: "Click 'Fetch Tools' to load available tools"}
							</p>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
