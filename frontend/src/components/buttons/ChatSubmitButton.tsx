import { FaStop } from "react-icons/fa";
import { MainToolTip } from "../tooltips/MainToolTip";
import { Button } from "../ui/button";
import { useChatContext } from "@/context/ChatContext";
import { ArrowUp, Mic, Square } from "lucide-react";
import { useEffect } from "react";
import apiClient from "../../lib/utils/apiClient";

interface ChatSubmitButtonProps {
	abortQuery: () => void;
	/** @deprecated Use enqueue from context instead */
	handleSubmit?: (query: string, images: File[]) => void;
	onRecordingChange?: (isRecording: boolean) => void;
	recorderControls?: any;
}

function ChatSubmitButton({
	abortQuery,
	handleSubmit: _handleSubmit,
	onRecordingChange,
	recorderControls,
}: ChatSubmitButtonProps) {
	// _handleSubmit is kept for backward compatibility but enqueue from context is used instead
	void _handleSubmit;
	const {
		controller,
		query,
		images,
		setQuery,
		setImages,
		enqueue,
		preflightSubmit,
	} = useChatContext();

	// Helper to enqueue and clear input
	const handleEnqueue = () => {
		if (!preflightSubmit(images)) return;
		if (enqueue(query, images)) {
			setQuery("");
			setImages([]);
		}
	};

	const { startRecording, stopRecording, isRecordingInProgress, recordedBlob } =
		recorderControls || {};

	// Notify parent component when recording state changes
	useEffect(() => {
		onRecordingChange?.(isRecordingInProgress);
	}, [isRecordingInProgress, onRecordingChange]);

	// Handle recorded blob when it's available
	useEffect(() => {
		if (!recordedBlob) return;

		// Create FormData and send to transcription endpoint
		const formData = new FormData();
		formData.append("file", recordedBlob, "recording.webm");
		formData.append("model", "whisper-large-v3");
		formData.append("response_format", "verbose_json");
		formData.append("temperature", "0.0");
		formData.append("timeout", "30");

		apiClient
			.post("/llm/transcribe", formData, {
				headers: {
					"Content-Type": "multipart/form-data",
				},
			})
			.then((response) => {
				setQuery((prev: string) =>
					prev
						? `${prev} ${response.data.transcript.text}`
						: response.data.transcript.text,
				);
			})
			.catch((error) => {
				console.error("Error uploading audio:", error);
				alert("Error uploading audio");
			});
	}, [recordedBlob, setQuery]);

	// Add keyboard event handler for Alt+H
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			// Check for Alt+H combination
			if (event.altKey && event.key.toLowerCase() === "h") {
				event.preventDefault();

				// Only allow recording when query is empty
				if (query.trim() === "" && images.length === 0) {
					if (isRecordingInProgress) {
						handleStopRecording();
					} else {
						handleStartRecording();
					}
				}
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [isRecordingInProgress, query, images]);

	const handleStartRecording = async () => {
		if (startRecording) {
			startRecording();
		}
	};

	const handleStopRecording = () => {
		if (stopRecording) {
			stopRecording();
		}
	};

	// During streaming, show abort button and optionally submit-to-queue button
	if (controller) {
		const hasContent = query.trim() !== "" || images.length > 0;

		return (
			<div className="flex items-center gap-1">
				{/* Submit-to-queue button (when there's content during streaming) */}
				{hasContent && (
					<MainToolTip content="Add to queue" delayDuration={500}>
						<Button
							onClick={(e) => {
								e.stopPropagation();
								handleEnqueue();
							}}
							size="icon"
							className="w-10 h-10 rounded-full m-1"
						>
							<ArrowUp className="h-7 w-7" />
						</Button>
					</MainToolTip>
				)}

				{/* Abort button */}
				<MainToolTip content="Abort" delayDuration={500}>
					<Button
						onClick={abortQuery}
						size="icon"
						className="w-10 h-10 rounded-full m-1 bg-red-500"
					>
						<FaStop className="h-7 w-7" />
					</Button>
				</MainToolTip>
			</div>
		);
	}

	// Show microphone button when query is empty and no images
	if (query.trim() === "" && images.length === 0) {
		if (isRecordingInProgress) {
			return (
				<MainToolTip content="Stop recording (Alt + H)" delayDuration={500}>
					<Button
						onClick={(e) => {
							e.stopPropagation();
							handleStopRecording();
						}}
						size="icon"
						className="w-10 h-10 rounded-full m-1 bg-red-500 hover:bg-red-600"
					>
						<Square className="h-7 w-7" />
					</Button>
				</MainToolTip>
			);
		}

		return (
			<MainToolTip content="Start recording (Alt + H)" delayDuration={500}>
				<Button
					onClick={(e) => {
						e.stopPropagation();
						handleStartRecording();
					}}
					size="icon"
					className="w-10 h-10 rounded-full m-1"
				>
					<Mic className="h-7 w-7" />
				</Button>
			</MainToolTip>
		);
	}

	// Show regular submit button when there's text or images
	return (
		<MainToolTip content="Send Message" delayDuration={500}>
			<Button
				onClick={(e) => {
					e.stopPropagation();
					// Use enqueue for consistency with queue system
					handleEnqueue();
				}}
				disabled={false}
				size="icon"
				className="w-10 h-10 rounded-full m-1"
			>
				<ArrowUp className="h-7 w-7" />
			</Button>
		</MainToolTip>
	);
}

export default ChatSubmitButton;
