import { LogOut, Trash2, Unlink, User, Users, X } from "lucide-react";
import Avatar from "./Avatar.jsx";
import { getRoomAvatarProps, getDirectPeerId, isDirectPeerOnline } from "../utils/room.js";

function RoomInfoModal({
  room,
  currentUser,
  onClose,
  onClearHistory,
  onLeaveGroup,
  onDeleteRoom
}) {
  if (!room) return null;

  const isGroup = room.type === "group";
  const members = buildMembers(room, currentUser);
  const roomAvatar = getRoomAvatarProps(room);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              聊天室資訊
            </h2>

            <p className="text-sm text-gray-400 mt-1">
              {isGroup ? "群組聊天室" : "1 對 1 聊天室"}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl mb-5">
          <Avatar text={roomAvatar.text} imageUrl={roomAvatar.imageUrl} />

          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 truncate">
              {room.name}
            </h3>

            <p className="text-sm text-gray-500 truncate">
              {isGroup
                ? `${members.length} 位成員`
                : `User ID: ${room.userId}`}
            </p>
          </div>
        </div>

        {isGroup ? (
          <GroupMembersSection
            members={members}
            currentUser={currentUser}
          />
        ) : (
          <DirectUserSection
            room={room}
          />
        )}

        <div className="space-y-3 mt-5">
          <button
            onClick={onClearHistory}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-50 text-red-600 font-semibold hover:bg-red-100"
          >
            <Trash2 size={18} />
            刪除此聊天室聊天紀錄
          </button>

          {isGroup ? (
            <button
              onClick={onLeaveGroup}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-red-200 text-red-600 font-semibold hover:bg-red-50"
            >
              <LogOut size={18} />
              退出群組
            </button>
          ) : (
            <button
              onClick={onDeleteRoom}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-red-200 text-red-600 font-semibold hover:bg-red-50"
            >
              <Unlink size={18} />
              解除 1 對 1 聊天室
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function GroupMembersSection({ members, currentUser }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Users size={18} className="text-blue-600" />
        <h3 className="font-bold text-gray-900">
          群組成員
        </h3>
      </div>

      <div className="space-y-2">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between p-3 rounded-2xl border border-gray-100 hover:bg-gray-50"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <Avatar
                  text={member.avatarText}
                  imageUrl={member.avatarUrl}
                />

                <span
                  className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full ${
                    member.online ? "bg-green-500" : "bg-gray-300"
                  }`}
                />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 truncate">
                    {member.name}
                  </p>

                  {member.id === currentUser.id && (
                    <span className="text-xs text-blue-500 shrink-0">
                      你
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-500 truncate">
                  UID: {member.id}
                </p>

                <p className="text-xs text-gray-400 truncate">
                  {member.email || "No email"}
                </p>
              </div>
            </div>

            <div className="shrink-0 ml-3">
              <span
                className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  member.online
                    ? "bg-green-50 text-green-600"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {member.online ? "Online" : "Offline"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DirectUserSection({ room }) {
  const peerId = getDirectPeerId(room);
  const peerOnline = isDirectPeerOnline(room);
  const profile = room.memberProfiles?.[0];

  const targetUser = {
    id: peerId,
    name: profile?.name || room.name,
    email: profile?.email || "",
    avatarText:
      profile?.avatarText || room.name.slice(0, 2).toUpperCase(),
    avatarUrl: profile?.avatarUrl || "",
    online: peerOnline
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <User size={18} className="text-blue-600" />
        <h3 className="font-bold text-gray-900">
          對方資訊
        </h3>
      </div>

      <div className="flex items-center justify-between p-3 rounded-2xl border border-gray-100 bg-gray-50">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <Avatar
              text={targetUser.avatarText}
              imageUrl={targetUser.avatarUrl}
            />

            <span
              className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full ${
                targetUser.online ? "bg-green-500" : "bg-gray-300"
              }`}
            />
          </div>

          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">
              {targetUser.name}
            </p>

            <p className="text-xs text-gray-500 truncate">
              UID: {targetUser.id}
            </p>

            <p className="text-xs text-gray-400 truncate">
              {targetUser.email || "No email"}
            </p>
          </div>
        </div>

        <span
          className={`text-xs font-semibold px-2 py-1 rounded-full ${
            targetUser.online
              ? "bg-green-50 text-green-600"
              : "bg-gray-100 text-gray-400"
          }`}
        >
          {targetUser.online ? "Online" : "Offline"}
        </span>
      </div>
    </div>
  );
}

function buildMembers(room, currentUser) {
  const onlineUsers = room.onlineUsers || [];
  const memberProfiles = room.memberProfiles || [];
  const profileMap = new Map(memberProfiles.map((member) => [member.id, member]));
  const memberIds = room.members?.length
    ? room.members
    : [currentUser.id, ...memberProfiles.map((member) => member.id)];

  const uniqueMemberIds = [...new Set(memberIds)];

  return uniqueMemberIds.map((memberId) => {
    if (memberId === currentUser.id) {
      return {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        avatarText: currentUser.avatarText,
        avatarUrl: currentUser.avatarUrl,
        online: onlineUsers.includes(currentUser.id)
      };
    }

    const profile = profileMap.get(memberId);

    return {
      id: memberId,
      name: profile?.name || memberId,
      email: profile?.email || "",
      avatarText:
        profile?.avatarText ||
        profile?.name?.slice(0, 2).toUpperCase() ||
        memberId.slice(0, 2).toUpperCase(),
      avatarUrl: profile?.avatarUrl || "",
      online: onlineUsers.includes(memberId)
    };
  });
}

export default RoomInfoModal;