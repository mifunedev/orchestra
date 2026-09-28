import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { resolveThreadOwner } from "@/lib/services/threadService";

type UseInitialThreadRedirectOptions = {
	threadId?: string;
	hasMessages: boolean;
};

export default function useInitialThreadRedirect({
	threadId,
	hasMessages,
}: UseInitialThreadRedirectOptions): void {
	const navigate = useNavigate();
	const location = useLocation();
	const staleThreadId = (
		location.state as { staleThreadId?: string } | null | undefined
	)?.staleThreadId;
	const lastNavigatedThreadIdRef = useRef<string | null>(null);

	useEffect(() => {
		if (!threadId) {
			lastNavigatedThreadIdRef.current = null;
			return;
		}

		if (!hasMessages) {
			let active = true;
			resolveThreadOwner(threadId)
				.then((owner) => {
					if (
						active &&
						owner === "aegra" &&
						threadId !== staleThreadId &&
						lastNavigatedThreadIdRef.current !== threadId
					) {
						lastNavigatedThreadIdRef.current = threadId;
						navigate(`/thread/${threadId}`, { replace: true });
					}
				})
				.catch(() => {});
			return () => {
				active = false;
			};
		}

		// Skip redirect when the threadId matches the stale one we just left
		if (threadId === staleThreadId) {
			return;
		}

		if (lastNavigatedThreadIdRef.current === threadId) {
			return;
		}

		lastNavigatedThreadIdRef.current = threadId;
		navigate(`/thread/${threadId}`, { replace: true });
	}, [hasMessages, navigate, staleThreadId, threadId]);
}
