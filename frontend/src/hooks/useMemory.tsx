import { useChatContext } from "@/context/ChatContext";
import { useEffect } from "react";

export function useMemory() {
	const { payload, setPayload } = useChatContext();

	useEffect(() => {
		// Initialize memory from localStorage on mount
		const storedMemory = localStorage.getItem("orchestra:chat:payload:memory");
		if (storedMemory) {
			const memory = JSON.parse(storedMemory);
			if (typeof memory === "boolean") {
				setPayload((prev: any) => ({ ...prev, memory }));
			}
		}
	}, []);

	useEffect(() => {
		// Update localStorage whenever payload.memory changes
		if (typeof payload.memory === "boolean") {
			localStorage.setItem(
				"orchestra:chat:payload:memory",
				JSON.stringify(payload.memory),
			);
		}
	}, [payload.memory]);

	return typeof payload.memory === "boolean" ? payload.memory : false;
}
