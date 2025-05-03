import React, { useState, useEffect, useRef } from "react";

// WebSocket Endpoints (LOCAL)
const SERVER_URL = "ws://localhost:9986/ws/gladia/speaker";
const LISTEN_URL = "ws://localhost:9986/ws/gladia/listener";
const LISTEN_SUMMARY_URL = "ws://localhost:9986/ws/summary";

// WebSocket Endpoints (PH SERVER)
// const SERVER_URL = "wss://qurious.ddns.net/qurious-transcription/ws/gladia/speaker";
// const LISTEN_URL = "wss://qurious.ddns.net/qurious-transcription/ws/gladia/listener";

// WebSocket Endpoints (AWS SERVER)
// const SERVER_URL = "wss://api.qurious.lexcodeapi.com/transcription/ws/gladia/speaker";
// const LISTEN_URL = "wss://api.qurious.lexcodeapi.com/transcription/ws/gladia/listener";

// Required WebSocket Parameters
const event_id : string = "event-abc";
const room_id : string = "session-012";
const speaker_id : string = "michael2025";
const default_language : string = "en";
const expected_languages: string[] = ["en", "tl", "kr"];

// const generateRandomId = (prefix: string) => {
//   return `${prefix}_${Math.random().toString(36).substr(2, 8)}`;
// };

const TranscriptionPage: React.FC = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [transcription, setTranscription] = useState<string>("");
  const [translatedTranscription, setTranslatedTranscription] = useState<string>("");
  const [summary, setSummary] = useState<string>("");

  // System Parameters
  const [speakerId, setSpeakerId] = useState<string>(speaker_id);
  const [eventId, setEventId] = useState<string>(event_id);
  const [roomId, setRoomId] = useState<string>(room_id);
  const [language, setLanguage] = useState<string>(default_language);
  const [customPrompt, setCustomPrompt] = useState<string>("");

  // WebSocket & Audio Refs
  const wsSender = useRef<WebSocket | null>(null);
  const transcriptionSocketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Connect to Transcription WebSocket
    transcriptionSocketRef.current = new WebSocket(
      `${LISTEN_URL}?event_id=${eventId}&room_id=${roomId}&speaker_id=${speakerId}&lang=${language}`
    );

    transcriptionSocketRef.current.onmessage = (event) => {
      // console.log("Received transcription:", event);
      const data = JSON.parse(event.data);
      console.log("TRANSCRIPTION DATA:", data)

      setTranscription((prev) => prev + " " + data.original);
      setTranslatedTranscription((prev) => prev + " " + data.translated);
    };

    transcriptionSocketRef.current.onclose = () => {
      console.log("🔴 Transcription WebSocket closed");
    };

    // Connect to Summarization Socket
    const summarySocket = new WebSocket(
      `${LISTEN_SUMMARY_URL}?event_id=${eventId}&room_id=${roomId}&speaker_id=${speakerId}&lang=${language}`
    );
  
    summarySocket.onopen = () => {
      console.log("🟢 Summary WebSocket connected");
    };
  
    summarySocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("📩 Summary Received:", data);
      if (data.summary) {
        setSummary(data.summary); // overwrite previous summary
      }
    };
  
    summarySocket.onclose = () => {
      console.log("🔴 Summary WebSocket disconnected");
    };
  
    return () => {
      transcriptionSocketRef.current?.close();
      summarySocket.close();
    };
  }, [eventId, roomId, speakerId, language]);

  // Reset Transcript
  useEffect(() => {
    setTranscription("");
    setTranslatedTranscription("");
  }, [eventId, roomId, speakerId]);

  // Start Audio Streaming
  const startStreaming = async () => {

    try {
      // Ensure WebSocket is connected
      if (!wsSender.current || wsSender.current.readyState !== WebSocket.OPEN) {
        const params = new URLSearchParams({
          event_id: eventId,
          room_id: roomId,
          speaker_id: speakerId,
          default_language: "en",
        });
        
        expected_languages.forEach(lang => {
          params.append("languages", lang);
        });
        
        if (customPrompt.trim() !== "") {
          params.append("custom_prompt", customPrompt);
        }
        
        wsSender.current = new WebSocket(`${SERVER_URL}?${params.toString()}`);
        wsSender.current.binaryType = "arraybuffer";

        wsSender.current.onopen = () => {
          console.log("🎤 WebSocket connected, ready to send audio...");
          setIsStreaming(true);
        };

        wsSender.current.onerror = (error) => {
          console.error("WebSocket Error:", error);
          setIsStreaming(false);
        };

        wsSender.current.onclose = () => {
          console.log("🔴 WebSocket Disconnected");
          wsSender.current = null;
          setIsStreaming(false);
        };
      }

      // Request microphone access
      if (!streamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            noiseSuppression: true,
            echoCancellation: true,
            autoGainControl: true
          }
        });
        streamRef.current = stream;
      }

      // Setup Audio Context
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(streamRef.current);
      sourceRef.current = source;
      const processor = audioContext.createScriptProcessor(1024, 1, 1);
      processorRef.current = processor;

      // Audio Filters
      const highPassFilter = audioContext.createBiquadFilter();
      highPassFilter.type = "highpass";
      highPassFilter.frequency.value = 100;

      const compressor = audioContext.createDynamicsCompressor();
      compressor.threshold.value = -50;
      compressor.knee.value = 40;
      compressor.ratio.value = 12;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;

      // Connect Audio Nodes
      source.connect(highPassFilter);
      highPassFilter.connect(compressor);
      compressor.connect(processor);
      processor.connect(audioContext.destination);

      // Process & Send Audio
      processor.onaudioprocess = (event) => {
        const audioData = event.inputBuffer.getChannelData(0);
        const buffer = new ArrayBuffer(audioData.length * 2);
        const view = new DataView(buffer);

        for (let i = 0; i < audioData.length; i++) {
          const s = Math.max(-1, Math.min(1, audioData[i]));
          view.setInt16(i * 2, s * 32767, true);
        }

        if (wsSender.current && wsSender.current.readyState === WebSocket.OPEN) {
          wsSender.current.send(buffer);
        }
      };
    } catch (error) {
      console.error("Error starting streaming:", error);
    }
  };

  // Stop Streaming
  const stopStreaming = () => {
    console.log("🛑 Stopping audio streaming...");

    // Stop audio processing
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop microphone
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Close WebSocket
    if (wsSender.current) {
      wsSender.current.close();
      wsSender.current = null;
    }

    setIsStreaming(false);
  };

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
      className="p-4 max-w-2xl w-full mx-auto flex items-center justify-center min-h-screen border-4">
      <h1 className="text-xl font-bold text-red-500">Qurious: RT Transcription Tester</h1>

      <h2>Microphone:</h2>
      <button
      style={{
        maxWidth: "200px"
      }}
        className={`mt-4 px-4 py-2 text-white rounded ${isStreaming ? "bg-red-500" : "bg-green-500"}`}
        onClick={isStreaming ? stopStreaming : startStreaming}
      >
        {isStreaming ? "Stop Streaming" : "Start Streaming"}
      </button>


      <div style={{display: "flex",gap: 20,width: "100%"}}>
        {/* Speaker Parameter Section */}
        <div style={{ width: "100%"}} className="mt-6">
          <h2>Speak Parameter</h2>
          <label htmlFor="event-id-select" className="block text-sm font-medium text-gray-700">
            Speaker ID:
          </label>
          <input
            type="text"
            id="speaker-id-input"
            style={{ maxWidth: "200px" }}
            className="mt-2 block w-full p-2 border border-gray-300 rounded"
            value={speakerId}
            onChange={(e) => setSpeakerId(e.target.value)}
          />
        </div>

        {/* Listen Parameter Section */}
        <div style={{ width: "100%"}} className="mt-6">
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
            style={{ maxWidth: "200px"}}
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

      <h2>Custom Prompt:</h2>
      <div className="mt-4">
        <textarea
          id="custom-prompt"
          rows={4}
          style={{
            width: "100%",
            padding: 12,
            fontSize: 16
          }}
          className="mt-1 block w-full p-2 border border-gray-300 rounded"
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="You are a professional translator. Using context from previous utterances, translate ONLY the latest one, nothing else"
        />
      </div>

      <div style={{display: "flex",gap: 20,width: "100%"}}>
        {/* Original Transcription Section */}
        <div style={{ width: "100%"}} className="mt-6">
          <h2 className="text-lg font-semibold">Original Transcription:</h2>
          <div style={{ height: "200px", overflowY: "scroll", border: "1px solid black", marginTop: "10px", padding: "10px" }}>
            {transcription.split("\n").map((line, index) => (
              <p key={index} className="text-gray-700 whitespace-pre-line">
                {line}
              </p>
            ))}
          </div>
        </div>

        {/* Translated Transcription Section */}
        <div style={{ width: "100%"}} className="mt-6">
          <h2 className="text-lg font-semibold">{language} Translation:</h2>
          <div style={{ height: "200px", overflowY: "scroll", border: "1px solid black", marginTop: "10px", padding: "10px" }}>
            {translatedTranscription.split("\n").map((line, index) => (
              <p key={index} className="text-gray-700 whitespace-pre-line">
                {line}
              </p>
            ))}
          </div>
        </div>
      </div>

      <div style={{ borderTop: "2px dashed white", margin: "60px 0 30px 0" }}></div>
      
      {/* Summary Section */}
      <h2 className="text-lg font-semibold mb-1">Summarization:</h2>
      <div className="mt-2">
        <div style={{ height: "200px", overflowY: "scroll", border: "1px solid black", padding: "10px"}}>
          <p className="text-gray-700 whitespace-pre-line" style={{ userSelect: summary ? "auto" : "none", color: summary ? "inherit" : "gray"}}>
            {summary || "Waiting for summary..."}
          </p>
        </div>
      </div>

    </div>
  );
};

export default TranscriptionPage;
