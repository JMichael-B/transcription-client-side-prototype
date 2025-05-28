import React, { useState, useEffect, useRef } from "react";

// WebSocket Endpoints (LOCAL)
const LISTEN_URL = "ws://localhost:9986/ws/transcription_demo/listener";
// const LISTEN_URL = "wss://qurious.ddns.net/qurious-transcription/ws/transcription_demo/listener";

// Required WebSocket Parameters
const event_id: string = "event-qurious-live-demo";
const room_id: string = "session-live-demo-1";
const default_language: string = "en";
// const expected_languages: string[] = ["en", "tl", "kr"];

// const generateRandomId = (prefix: string) => {
// 	return `${prefix}_${Math.random().toString(36).substr(2, 8)}`;
// };

const TranscriptionPage: React.FC = () => {
    const [transcription, setTranscription] = useState<string>("");

    // System Parameters
    const [eventId, setEventId] = useState<string>(event_id);
    const [roomId, setRoomId] = useState<string>(room_id);
    const [language, setLanguage] = useState<string>(default_language);
    const [showAIVoice, setShowAIVoice] = useState<boolean>(false);

    // WebSocket & Audio Refs
    const transcriptionSocketRef = useRef<WebSocket | null>(null);

    // Connect to Transcription WebSocket
    useEffect(() => {
        transcriptionSocketRef.current = new WebSocket(
            `${LISTEN_URL}?event_id=${eventId}&room_id=${roomId}&lang=${language}`
        );

        // Set binaryType to receive audio as Blob
        transcriptionSocketRef.current.binaryType = "arraybuffer";

        transcriptionSocketRef.current.onmessage = (event) => {
            if (typeof event.data === "string") {
                // Handle transcription text
                const data = JSON.parse(event.data);
                console.log("TRANSCRIPTION DATA:", data);

                if (language === 'en') {
                    setTranscription((prev) => prev + " " + data.original);
                } else {
                    setTranscription((prev) => prev + " " + data.translated);
                }
            } else if (event.data instanceof ArrayBuffer) {
                // Handle audio data
                const audioBlob = new Blob([event.data], { type: "audio/mpeg" });
                const audioUrl = URL.createObjectURL(audioBlob);

                // Play audio if AI Voice is enabled
                if (showAIVoice) {
                    const audio = new Audio(audioUrl);
                    audio.play();
                }
            }
        };

        transcriptionSocketRef.current.onclose = () => {
            console.log("🔴 Transcription WebSocket closed");
        };

        return () => {
            transcriptionSocketRef.current?.close();
        };
    }, [language, eventId, roomId, showAIVoice]);

    // Reset Transcript
    useEffect(() => {
        setTranscription("");
    }, [eventId, roomId]);

    return (
        <div
            style={{
                padding: 4,
                maxWidth: "1000px",
                width: "100%",
                margin: "auto",
                display: "flex",
                justifyContent: "center",
                minHeight: "100vh",
                flexDirection: "column"
            }}
            className="p-4 max-w-2xl w-full mx-auto flex items-center justify-center min-h-screen border-4"
        >
            <h1 className="text-xl font-bold text-red-500">Qurious: Live Demo</h1>

            <div style={{ display: "flex", gap: 20, width: "100%" }}>
                {/* Listen Parameter Section */}
                <div style={{ width: "100%" }} className="mt-6">
                    <h2>Listen Parameters:</h2>
                    <label htmlFor="event-id-select" className="block text-sm font-medium text-gray-700">
                        Event ID:
                    </label>
                    <input
                        type="text"
                        id="event-id-input"
                        style={{ maxWidth: "200px" }}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded"
                        value={eventId}
                        onChange={(e) => setEventId(e.target.value)}
                    />
                    <br />
                    <label htmlFor="room-id-select" className="block text-sm font-medium text-gray-700">
                        Room ID:
                    </label>
                    <input
                        type="text"
                        id="room-id-input"
                        style={{ maxWidth: "200px" }}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded"
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                    />
                    <br />
                    <label htmlFor="language-select" className="block text-sm font-medium text-gray-700">
                        Select Language:
                    </label>
                    <select
                        style={{ maxWidth: "200px" }}
                        id="language-select"
                        className="mt-1 block w-full p-2 border border-gray-300 rounded"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                    >
                        <option value="en">English</option>
                        <option value="tl">Tagalog</option>
                        <option value="ko">Korean</option>
                    </select>
                </div>
            </div>

            <div style={{ display: "flex", gap: 20, width: "100%" }}>
                {/* Transcription Section */}
                <div style={{ width: "100%" }} className="mt-6">
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "8px 0" }}>
                        {/* Label */}
                        <h2 className="text-lg font-semibold">
                            {language === "en" ? "English Transcription" : `${language.toUpperCase()} Translation`}:
                        </h2>
                        {/*Toggle Switch*/}
                        <label>
                            <input
                                type="checkbox"
                                checked={showAIVoice}
                                onChange={() => setShowAIVoice((prev) => !prev)}
                                style={{ width: 40, height: 20 }}
                            />
                            <span>AI Voice</span>
                            {showAIVoice && (
                                <span style={{ fontSize: "1.3em", color: "#4ade80" }}>🔊</span>
                            )}
                        </label>
                    </div>
                    {/* Box */}
                    <div style={{ height: "500px", overflowY: "scroll", border: "1px solid black", marginTop: "10px", padding: "10px" }}>
                        {transcription
                            .split("\n")
                            .map((line, index) => (
                                <p key={index} className="text-gray-700 whitespace-pre-line">
                                    {line}
                                </p>
                            ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TranscriptionPage;
