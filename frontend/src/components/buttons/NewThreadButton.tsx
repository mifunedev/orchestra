import { useChatContext } from "@/context/ChatContext";
import { removeActiveStreamRecovery } from "@/lib/utils/activeStreamRecovery";
import { Button } from "../ui/button";
import { Plus } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

function NewThreadButton() {
	const {
		messages,
		clearMessages,
		setRunError,
		setSubmissionFiles,
		metadata,
		abortQuery,
		resetToDefault,
		loadPersistentContextFiles,
		clearThreadScopedFiles,
		clearBackendSyncFiles,
	} = useChatContext();
	const navigate = useNavigate();
	const location = useLocation();

	const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
		if (e.ctrlKey) {
			window.open(window.location.href, "_blank");
		} else {
			// Abort active stream BEFORE clearing to prevent race condition
			// where SSE handler re-populates stale thread_id after clear
			abortQuery();
			if (metadata?.thread_id) {
				removeActiveStreamRecovery(metadata.thread_id);
			}

			// Capture navigation values before clearing metadata
			const pathname = location.pathname;
			const threadId = metadata?.thread_id;
			const assistantId = metadata?.assistant_id;
			const projectId = metadata?.project_id;

			// Clear state eagerly. React may batch these updates, so the
			// destination page also guards against stale state via the
			// staleThreadId navigation state.
			clearMessages();
			setRunError?.(null);
			setSubmissionFiles?.(null);
			clearThreadScopedFiles?.();
			clearBackendSyncFiles?.();
			// Reset model to user's default for new conversations
			resetToDefault?.();
			loadPersistentContextFiles?.();

			// Navigate — pass staleThreadId so the destination page can
			// force-clear any lingering messages that survived batching.
			if (pathname.startsWith("/thread/")) {
				navigate("/chat", {
					state: { staleThreadId: threadId },
				});
			} else if (pathname.startsWith("/assistant/")) {
				navigate(`/assistant/${assistantId}`);
			} else if (pathname.match(/^\/p\/[^/]+\/t\//)) {
				const pathProjectId = pathname.split("/")[2];
				navigate(`/p/${pathProjectId}`);
			} else if (pathname.startsWith("/p/") && !projectId) {
				navigate("/chat", {
					state: { staleThreadId: threadId },
				});
			}
		}
	};

	if (messages.length > 0) {
		return (
			<div className="w-9">
				<Button
					size="icon"
					onClick={handleClick}
					variant="outline"
					className="h-9 w-9"
					title="New Chat"
				>
					<Plus className="h-4 w-4" />
				</Button>
			</div>
		);
	}

	return null;
}

export default NewThreadButton;
