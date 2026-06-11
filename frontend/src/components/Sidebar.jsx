import { useState } from "react";
import { LogOut, Plus, Search, LayoutDashboard, Pencil } from "lucide-react";
import Avatar from "./Avatar.jsx";
import ChatRoomItem from "./ChatRoomItem.jsx";
import EditIdModal from "./EditIdModal.jsx";
import UnreadBadge from "./UnreadBadge.jsx";

function Sidebar({
  currentUser,
  rooms,
  selectedRoomId,
  unreadCounts = {},
  totalUnread = 0,
  searchText,
  onSearchTextChange,
  onSelectRoom,
  onOpenNewRoom,
  onLogout,
  onOpenAdmin,
  onUpdateUserId
}) {
  const [showEditId, setShowEditId] = useState(false);
  return (
    <>
    <aside className="w-full h-full bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
            TSMChat
            <UnreadBadge count={totalUnread} />
          </h1>

          <div className="flex items-center gap-1">
            {onOpenAdmin && (
              <button
                onClick={onOpenAdmin}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
                title="Admin Dashboard"
              >
                <LayoutDashboard size={20} />
              </button>
            )}

            <button
              onClick={onLogout}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
              title="登出"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div className="relative shrink-0">
            <Avatar
              text={currentUser.avatarText}
              imageUrl={currentUser.avatarUrl}
            />
            {totalUnread > 0 && (
              <UnreadBadge
                count={totalUnread}
                dot
                className="-top-1 -right-1"
              />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-gray-900 truncate">
              {currentUser.name}
            </h2>

            <p className="text-xs text-gray-500 truncate">
              {currentUser.email}
            </p>

            <p className="text-xs text-gray-400 truncate mt-0.5 flex items-center gap-1">
              <span>ID: {currentUser.id}</span>
              {onUpdateUserId && (
                <button
                  onClick={() => setShowEditId(true)}
                  className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600"
                  title="變更 ID"
                >
                  <Pencil size={12} />
                </button>
              )}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 bg-gray-100 rounded-full px-4 py-2 flex items-center gap-2">
            <Search size={18} className="text-gray-400" />

            <input
              value={searchText}
              onChange={(event) => onSearchTextChange(event.target.value)}
              placeholder="搜尋聊天室"
              className="bg-transparent outline-none text-sm w-full"
            />
          </div>

          <button
            onClick={onOpenNewRoom}
            className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center"
            title="新增聊天室"
          >
            <Plus size={22} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {rooms.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-gray-400">
            尚無聊天室
          </div>
        ) : (
          rooms.map((room) => (
            <ChatRoomItem
              key={room.id}
              room={room}
              active={room.id === selectedRoomId}
              unreadCount={unreadCounts[room.id] || 0}
              currentUserId={currentUser.id}
              onClick={() => onSelectRoom(room.id)}
            />
          ))
        )}
      </div>
    </aside>
    {showEditId && onUpdateUserId && (
      <EditIdModal
        currentUser={currentUser}
        onClose={() => setShowEditId(false)}
        onSave={onUpdateUserId}
      />
    )}
  </>
  );
}

export default Sidebar;
