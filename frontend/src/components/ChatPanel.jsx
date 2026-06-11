import { ArrowLeft, Info, MessageCircle, Send, Users } from "lucide-react";
import Avatar from "./Avatar.jsx";
import MessageBubble from "./MessageBubble.jsx";
import { getRoomAvatarProps, isOwnMessage, isDirectPeerOnline, getGroupOnlineCount } from "../utils/room.js";

function ChatPanel({
  currentUser,
  selectedRoom,
  messages,
  inputText,
  onInputTextChange,
  onSendMessage,
  messagesEndRef,
  onBackToList,
  onOpenRoomInfo
}) {
  if (!selectedRoom) {
    return (
      <main className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-400">
          <MessageCircle size={56} className="mx-auto mb-3" />
          <p>請選擇或新增一個聊天室</p>
        </div>
      </main>
    );
  }

  const isGroup = selectedRoom.type === "group";
  const peerOnline = isDirectPeerOnline(selectedRoom);
  const groupOnlineCount = getGroupOnlineCount(selectedRoom, currentUser.id);
  const roomAvatar = getRoomAvatarProps(selectedRoom);

  return (
    <main className="flex-1 bg-gray-50 flex flex-col min-w-0">
      <div className="h-16 bg-white border-b border-gray-200 px-4 md:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBackToList}
            className="md:hidden p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-500"
          >
            <ArrowLeft size={22} />
          </button>

          <Avatar text={roomAvatar.text} imageUrl={roomAvatar.imageUrl} />

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-gray-900 truncate">
                {selectedRoom.name}
              </h2>

              {isGroup && (
                <Users size={16} className="text-blue-600 shrink-0" />
              )}
            </div>

            <p className="text-xs text-gray-500 truncate">
              {isGroup
                ? `${selectedRoom.members?.length || 0} 位成員，${groupOnlineCount} 人上線`
                : `User ID: ${selectedRoom.userId}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div
            className={`hidden sm:block text-sm font-medium ${
              isGroup || peerOnline ? "text-green-500" : "text-gray-400"
            }`}
          >
            {isGroup
              ? `${groupOnlineCount} 人上線`
              : peerOnline
                ? "● Online"
                : "○ Offline"}
          </div>

          <button
            onClick={onOpenRoomInfo}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
            title="聊天室資訊"
          >
            <Info size={21} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              currentUser={currentUser}
              isMine={isOwnMessage(message, currentUser.id)}
              isSystem={message.senderId === "system"}
              showSenderName={isGroup}
            />
          ))}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="bg-white border-t border-gray-200 px-4 md:px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <input
            value={inputText}
            onChange={(event) => onInputTextChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onSendMessage();
              }
            }}
            placeholder="輸入訊息..."
            className="flex-1 bg-gray-100 rounded-full px-5 py-3 outline-none focus:ring-2 focus:ring-blue-400"
          />

          <button
            onClick={onSendMessage}
            disabled={!inputText.trim()}
            className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition disabled:opacity-40 shrink-0"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </main>
  );
}

export default ChatPanel;