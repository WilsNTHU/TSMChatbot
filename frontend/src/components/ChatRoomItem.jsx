import { Users } from "lucide-react";
import Avatar from "./Avatar.jsx";
import UnreadBadge from "./UnreadBadge.jsx";
import { getRoomAvatarProps, isDirectPeerOnline, getGroupOnlineCount } from "../utils/room.js";

function ChatRoomItem({ room, active, unreadCount = 0, currentUserId = "", onClick }) {
  const isGroup = room.type === "group";
  const peerOnline = isDirectPeerOnline(room);
  const groupOnlineCount = getGroupOnlineCount(room, currentUserId);
  const roomAvatar = getRoomAvatarProps(room);

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${
        active ? "bg-blue-50" : "hover:bg-gray-50"
      }`}
    >
      <div className="relative shrink-0">
        <Avatar text={roomAvatar.text} imageUrl={roomAvatar.imageUrl} />

        {unreadCount > 0 && (
          <UnreadBadge
            count={unreadCount}
            dot
            className="-top-1 -right-1 z-10"
          />
        )}

        {!isGroup && peerOnline && unreadCount === 0 && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
        )}

        {isGroup && (
          <span className="absolute -bottom-1 -right-1 bg-blue-600 text-white rounded-full p-1">
            <Users size={10} />
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1 gap-2">
          <h3 className={`font-semibold truncate ${unreadCount > 0 ? "text-gray-900" : "text-gray-900"}`}>
            {room.name}
          </h3>

          <div className="flex items-center gap-1 shrink-0 ml-2">
            <UnreadBadge count={unreadCount} className="md:hidden" />
            <span className="text-xs text-gray-400">
              {room.updatedAt}
            </span>
          </div>
        </div>

        <p className="text-sm text-gray-500 truncate">
          {room.lastMessage}
        </p>

        <p className="text-xs text-gray-400 truncate mt-0.5">
          {isGroup
            ? `${room.members?.length || 0} 位成員，${groupOnlineCount} 人上線`
            : peerOnline
              ? "Online"
              : "Offline"}
        </p>
      </div>
    </button>
  );
}

export default ChatRoomItem;