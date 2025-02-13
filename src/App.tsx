import React from "react";
import Chat from "./components/Chat";

const App: React.FC = () => {
    return (
        <div className="flex items-center justify-center h-screen bg-gray-100">
            <Chat />
        </div>
    );
};

export default App;
