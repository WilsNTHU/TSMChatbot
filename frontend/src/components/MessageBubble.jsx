import Avatar from "./Avatar.jsx";
import { getRoomAvatarProps } from "../utils/room.js";

function MessageBubble({ message, isMine, isSystem, showSenderName, currentUser }) {
  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="text-xs text-gray-400 bg-gray-200 px-3 py-1 rounded-full">
          {message.text}
        </div>
      </div>
    );
  }

  const avatarText = isMine
    ? currentUser?.avatarText ||
      message.senderAvatarText ||
      message.senderName?.slice(0, 2).toUpperCase() ||
      "?"
    : message.senderAvatarText ||
      message.senderName?.slice(0, 2).toUpperCase() ||
      message.senderId?.slice(0, 2).toUpperCase() ||
      "?";

  const avatarUrl = isMine
    ? currentUser?.avatarUrl || message.senderAvatarUrl || ""
    : message.senderAvatarUrl || "";

  return (
    <div className={`flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"}`}>
      {!isMine && (
        <Avatar
          text={avatarText}
          imageUrl={avatarUrl}
          size="sm"
        />
      )}

      <div className="max-w-[78%] md:max-w-[70%]">
        {showSenderName && !isMine && (
          <div className="flex items-center gap-1 mb-1 ml-1">
            <p className="text-xs text-gray-400">
              {message.senderName || message.senderId}
            </p>
          </div>
        )}

        <div
          className={`px-4 py-2 rounded-3xl shadow-sm ${
            isMine
              ? "bg-blue-600 text-white rounded-br-md"
              : "bg-white text-gray-900 rounded-bl-md"
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.text}
          </p>

          <p
            className={`text-[10px] mt-1 ${
              isMine ? "text-blue-100" : "text-gray-400"
            }`}
          >
            {message.createdAt}
          </p>
        </div>
      </div>

      {isMine && (
        <Avatar
          text={avatarText}
          imageUrl={avatarUrl}
          size="sm"
        />
      )}
    </div>
  );
}

export default MessageBubble;