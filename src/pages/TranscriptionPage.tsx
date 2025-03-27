import React, { useState, useEffect, useRef } from "react";

// const SERVER_URL = "ws://localhost:9000/ws/gladia/speaker"
// const LISTEN_URL = "ws://localhost:9000/ws/gladia/listener"


const TranscriptionPage: React.FC = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [transcription, setTranscription] = useState<string>("");
  const audioSocketRef = useRef<WebSocket | null>(null);
  const transcriptionSocketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    // Connect to transcription WebSocket
    transcriptionSocketRef.current = new WebSocket("ws://localhost:9000/ws/gladia/listener");

    transcriptionSocketRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setTranscription((prev) => prev + " " + data.translated);
    };

    transcriptionSocketRef.current.onclose = () => {
      console.log("Transcription WebSocket closed");
    };

    return () => {
      transcriptionSocketRef.current?.close();
    };
  }, []);

  const startStreaming = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      audioSocketRef.current = new WebSocket("ws://localhost:9000/ws/gladia/speaker");
      
      audioSocketRef.current.onopen = () => {
        console.log("Audio WebSocket connected");
      };

      audioSocketRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0 && audioSocketRef.current?.readyState === WebSocket.OPEN) {
          audioSocketRef.current.send(event.data);
        }
      };
      
      mediaRecorderRef.current.start(500);
      setIsStreaming(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopStreaming = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    
    if (audioSocketRef.current) {
      audioSocketRef.current.close();
    }
    
    setIsStreaming(false);
  };

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-xl font-bold">Live Transcription</h1>
      <button 
        className={`mt-4 px-4 py-2 text-white rounded ${isStreaming ? 'bg-red-500' : 'bg-green-500'}`} 
        onClick={isStreaming ? stopStreaming : startStreaming}
      >
        {isStreaming ? "Stop Streaming" : "Start Streaming"}
      </button>
      <div className="mt-4 p-4 border border-gray-300 rounded">
        <h2 className="text-lg font-semibold">Transcription:</h2>
        <p className="text-gray-700 whitespace-pre-line">{transcription}</p>
      </div>
    </div>
  );
};

export default TranscriptionPage;
