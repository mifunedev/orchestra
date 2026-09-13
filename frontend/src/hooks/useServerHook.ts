import { base64Compare } from "@/lib/utils/format";
import { useEffect, useMemo, useState } from "react";

const defaultMcpCode = `{
  "new-mcp-server": {
    "url": "https://mcp.mifune.dev/sse",
    "headers": {
      "x-mcp-key": "your_api_key"
    },
    "transport": "sse"
  }
}`;

const defaultA2A2Code = `{
  "new-a2a-server": {
    "base_url": "https://a2a.mifune.dev",
    "agent_card_path": "/.well-known/agent.json"
  }
}`;

function formatServerName(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-") // Replace special chars and spaces with dashes
		.replace(/^-+|-+$/g, ""); // Remove leading/trailing dashes
}

export const INIT_SERVER_STATE = {
	code: "",
	isJsonValid: true,
	error: "",
	formData: {
		name: "",
		description: "",
		type: "mcp",
		config: {
			transport: "sse",
			url: "",
			headers: {},
		},
		public: false,
	},
};

function useServerHook() {
	const [code, setCode] = useState(INIT_SERVER_STATE.code);
	const [isJsonValid, setIsJsonValid] = useState(INIT_SERVER_STATE.isJsonValid);
	const [error, setError] = useState(INIT_SERVER_STATE.error);
	const [formData, setFormData] = useState(INIT_SERVER_STATE.formData);

	const resetFormData = () => {
		setFormData(INIT_SERVER_STATE.formData);
	};

	const handleFormChange = (data: any) => {
		setFormData(data);
	};

	const useDefaultServerConfigEffect = () => {
		useEffect(() => {
			if (formData.type === "mcp") {
				setCode(defaultMcpCode);
			} else if (formData.type === "a2a") {
				setCode(defaultA2A2Code);
			}
		}, [formData.type]);
	};

	const useJsonValidationEffect = () => {
		useEffect(() => {
			try {
				JSON.parse(code);
				setIsJsonValid(true);
			} catch (_e) {
				setIsJsonValid(false);
			}
		}, [code]);
	};

	const useFormHandlerEffect = () => {
		useEffect(() => {
			if (formData.type === "mcp") {
				setCode((prevCode: any) => {
					try {
						const formattedName = formatServerName(formData.name);
						const key = formattedName || "new-mcp-server";

						// Create a fresh object with just one key
						const newObj = {
							[key]: {
								url: formData.config.url || "https://mcp.mifune.dev/sse",
								headers:
									Object.keys(formData.config.headers).length > 0
										? formData.config.headers
										: {},
								transport: formData.config.transport || "sse",
							},
						};

						return JSON.stringify(newObj, null, 2);
					} catch (error) {
						console.error("Error updating JSON:", error);
						return prevCode;
					}
				});
			}
		}, [
			formData.name,
			formData.type,
			formData.config.url,
			formData.config.headers,
			formData.config.transport,
		]);
	};

	const compareFormData = useMemo(() => {
		const matching = base64Compare(
			JSON.stringify(formData),
			JSON.stringify(INIT_SERVER_STATE.formData),
		);
		return matching;
	}, [formData]);

	return {
		code,
		setCode,
		isJsonValid,
		setIsJsonValid,
		error,
		setError,
		formData,
		setFormData,
		resetFormData,
		// Handlers
		handleFormChange,
		// Effects
		useDefaultServerConfigEffect,
		useJsonValidationEffect,
		useFormHandlerEffect,
		compareFormData,
	};
}

export default useServerHook;
