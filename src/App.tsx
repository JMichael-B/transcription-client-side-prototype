import React from "react";
import CommentsReactions from "./components/CommentsReactions";

const App: React.FC = () => {
    return (
        <div className="flex items-center justify-center h-screen bg-gray-100">
            <CommentsReactions />
        </div>
    );
};

export default App;
