import React, { useState, useEffect, useRef } from "react";

// WebSocket Endpoints (LOCAL)
const SERVER_URL = "ws://localhost:9986/ws/gladia/speaker";
const LISTEN_URL = "ws://localhost:9986/ws/gladia/listener";

// WebSocket Endpoints (PH SERVER)
// const SERVER_URL = "wss://qurious.ddns.net/qurious-transcription/ws/gladia/speaker";
// const LISTEN_URL = "wss://qurious.ddns.net/qurious-transcription/ws/gladia/listener";

// WebSocket Endpoints (AWS SERVER)
// const SERVER_URL = "wss://api.qurious.lexcodeapi.com/transcription/ws/gladia/speaker";
// const LISTEN_URL = "wss://api.qurious.lexcodeapi.com/transcription/ws/gladia/listener";

// Required WebSocket Parameters
const event_id : string = "eABC";
const room_id : string = "s012";
const speaker_id : string = "michael012";
const default_language : string = "en";

const expected_languages: string[] = ["en", "tl", "kr"];


const TranscriptionPage: React.FC = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [transcription, setTranscription] = useState<string>("");
  const [translatedTranscription, setTranslatedTranscription] = useState<string>("");
  const [language, setLanguage] = useState<string>(default_language);

  // WebSocket & Audio Refs
  const wsSender = useRef<WebSocket | null>(null);
  const transcriptionSocketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Connect to Transcription WebSocket
  useEffect(() => {
    transcriptionSocketRef.current = new WebSocket(
      `${LISTEN_URL}?event_id=${event_id}&room_id=${room_id}&speaker_id=${speaker_id}&lang=${language}`
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

    return () => {
      transcriptionSocketRef.current?.close();
    };
  }, [language]);

  // Start Audio Streaming
  const startStreaming = async () => {

    const langParam = expected_languages.join(",");
    try {
      // Ensure WebSocket is connected
      if (!wsSender.current || wsSender.current.readyState !== WebSocket.OPEN) {
        wsSender.current = new WebSocket(
          `${SERVER_URL}?event_id=${event_id}&room_id=${room_id}&speaker_id=${speaker_id}&lang=${langParam}`
        );
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
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-xl font-bold">Live Transcription Tester</h1>

      <h2>Microphone (Speaker):</h2>
      <button
        className={`mt-4 px-4 py-2 text-white rounded ${isStreaming ? "bg-red-500" : "bg-green-500"}`}
        onClick={isStreaming ? stopStreaming : startStreaming}
      >
        {isStreaming ? "Stop Streaming" : "Start Streaming"}
      </button>

      <h2>Transcription (listener):</h2>
      <label htmlFor="language-select" className="block text-sm font-medium text-gray-700">
          Select Language:
      </label>
      <select
        id="language-select"
        className="mt-1 block w-full p-2 border border-gray-300 rounded"
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
      >
        <option value="en">English</option>
        <option value="tl">Tagalog</option>
        <option value="ko">Korean</option>
      </select>

      <div className="mt-6">
        <h3 className="text-lg font-semibold">Original Transcription:</h3>
        <div style={{ height: "200px", overflowY: "scroll", border: "1px solid black", marginTop: "10px", padding: "10px" }}>
          {transcription.split("\n").map((line, index) => (
            <p key={index} className="text-gray-700 whitespace-pre-line">
              {line}
            </p>
          ))}
        </div>
      </div>

      {/* Translated Transcription Section */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold">{language} Translation:</h3>
        <div style={{ height: "200px", overflowY: "scroll", border: "1px solid black", marginTop: "10px", padding: "10px" }}>
          {translatedTranscription.split("\n").map((line, index) => (
            <p key={index} className="text-gray-700 whitespace-pre-line">
              {line}
            </p>
          ))}
        </div>
      </div>

    </div>
  );
};

export default TranscriptionPage;
