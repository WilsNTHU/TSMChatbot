import { useEffect, useMemo, useState } from "react";
import { Check, Search, User, Users, X } from "lucide-react";
import { searchUsers } from "../api/userApi.js";
import Avatar from "./Avatar.jsx";

function NewRoomModal({
  currentUserId,
  roomType,
  onRoomTypeChange,
  selectedDirectUser,
  onSelectDirectUser,
  groupName,
  onGroupNameChange,
  selectedGroupMembers,
  onSelectedGroupMembersChange,
  onCreate,
  onClose
}) {
  const [directKeyword, setDirectKeyword] = useState("");
  const [directResults, setDirectResults] = useState([]);

  const [groupKeyword, setGroupKeyword] = useState("");
  const [groupResults, setGroupResults] = useState([]);

  const selectedGroupMemberIds = useMemo(() => {
    return selectedGroupMembers.map((member) => member.id);
  }, [selectedGroupMembers]);

  useEffect(() => {
    async function searchDirect() {
      if (!directKeyword.trim()) {
        setDirectResults([]);
        return;
      }

      const results = await searchUsers(directKeyword, currentUserId);
      setDirectResults(results);
    }

    searchDirect();
  }, [directKeyword, currentUserId]);

  useEffect(() => {
    async function searchGroup() {
      if (!groupKeyword.trim()) {
        setGroupResults([]);
        return;
      }

      const results = await searchUsers(groupKeyword, currentUserId);

      const filteredResults = results.filter(
        (user) => !selectedGroupMemberIds.includes(user.id)
      );

      setGroupResults(filteredResults);
    }

    searchGroup();
  }, [groupKeyword, currentUserId, selectedGroupMemberIds]);

  const handleSelectDirectUser = (user) => {
    onSelectDirectUser(user);
    setDirectKeyword(user.id);
    setDirectResults([]);
  };

  const handleAddGroupMember = (user) => {
    if (selectedGroupMemberIds.includes(user.id)) {
      return;
    }

    onSelectedGroupMembersChange([...selectedGroupMembers, user]);
    setGroupKeyword("");
    setGroupResults([]);
  };

  const handleRemoveGroupMember = (userId) => {
    onSelectedGroupMembersChange(
      selectedGroupMembers.filter((member) => member.id !== userId)
    );
  };

  const handleRoomTypeChange = (nextType) => {
    onRoomTypeChange(nextType);

    setDirectKeyword("");
    setDirectResults([]);
    setGroupKeyword("");
    setGroupResults([]);

    if (nextType === "direct") {
      onSelectedGroupMembersChange([]);
    } else {
      onSelectDirectUser(null);
    }
  };

  const canCreate =
    roomType === "direct"
      ? Boolean(selectedDirectUser)
      : groupName.trim() && selectedGroupMembers.length > 0;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-gray-900">
            新增聊天室
          </h2>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-5">
          <button
            onClick={() => handleRoomTypeChange("direct")}
            className={`py-3 rounded-2xl font-semibold flex items-center justify-center gap-2 ${
              roomType === "direct"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            <User size={18} />
            1 對 1
          </button>

          <button
            onClick={() => handleRoomTypeChange("group")}
            className={`py-3 rounded-2xl font-semibold flex items-center justify-center gap-2 ${
              roomType === "group"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            <Users size={18} />
            群組
          </button>
        </div>

        {roomType === "direct" ? (
          <DirectUserSelector
            key="direct"
            keyword={directKeyword}
            onKeywordChange={(value) => {
              setDirectKeyword(value);
              onSelectDirectUser(null);
            }}
            results={directResults}
            selectedUser={selectedDirectUser}
            onSelectUser={handleSelectDirectUser}
          />
        ) : (
          <GroupUserSelector
            key="group"
            groupName={groupName}
            onGroupNameChange={onGroupNameChange}
            keyword={groupKeyword}
            onKeywordChange={setGroupKeyword}
            results={groupResults}
            selectedMembers={selectedGroupMembers}
            onAddMember={handleAddGroupMember}
            onRemoveMember={handleRemoveGroupMember}
          />
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
          >
            取消
          </button>

          <button
            onClick={onCreate}
            disabled={!canCreate}
            className="flex-1 py-3 rounded-2xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-40"
          >
            建立
          </button>
        </div>
      </div>
    </div>
  );
}

function DirectUserSelector({
  keyword,
  onKeywordChange,
  results,
  selectedUser,
  onSelectUser
}) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">
        搜尋對方使用者
      </label>

      <div className="relative mt-2">
        <div className="flex items-center gap-2 bg-gray-100 rounded-2xl px-4 py-3">
          <Search size={18} className="text-gray-400" />

          <input
            value={keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
            placeholder="輸入部分 UID、姓名或 Email，例如 ali"
            className="bg-transparent outline-none flex-1 text-sm"
          />

          {selectedUser && (
            <Check size={18} className="text-green-600" />
          )}
        </div>

        {results.length > 0 && (
          <UserDropdown
            users={results}
            onSelectUser={onSelectUser}
          />
        )}
      </div>

      {selectedUser ? (
        <div className="mt-3 p-3 rounded-2xl bg-blue-50 border border-blue-100 flex items-center gap-3">
          <Avatar
            text={selectedUser.avatarText}
            imageUrl={selectedUser.avatarUrl}
          />

          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">
              {selectedUser.name}
            </p>
            <p className="text-xs text-gray-500 truncate">
              UID: {selectedUser.id}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-400 mt-2">
          不需要完整輸入 UID，輸入一部分即可搜尋。
        </p>
      )}
    </div>
  );
}

function GroupUserSelector({
  groupName,
  onGroupNameChange,
  keyword,
  onKeywordChange,
  results,
  selectedMembers,
  onAddMember,
  onRemoveMember
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700">
          群組名稱
        </label>

        <div className="mt-2 flex items-center gap-2 bg-gray-100 rounded-2xl px-4 py-3">
          <Users size={18} className="text-gray-400" />

          <input
            value={groupName}
            onChange={(event) => onGroupNameChange(event.target.value)}
            placeholder="例如：Project Team"
            className="bg-transparent outline-none flex-1 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700">
          搜尋並加入群組成員
        </label>

        <div className="relative mt-2">
          <div className="flex items-center gap-2 bg-gray-100 rounded-2xl px-4 py-3">
            <Search size={18} className="text-gray-400" />

            <input
              value={keyword}
              onChange={(event) => onKeywordChange(event.target.value)}
              placeholder="輸入部分 UID、姓名或 Email"
              className="bg-transparent outline-none flex-1 text-sm"
            />
          </div>

          {results.length > 0 && (
            <UserDropdown
              users={results}
              onSelectUser={onAddMember}
            />
          )}
        </div>

        <p className="text-xs text-gray-400 mt-2">
          點選下拉選單中的使用者即可加入群組。
        </p>
      </div>

      {selectedMembers.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            已選擇成員
          </p>

          <div className="flex flex-wrap gap-2">
            {selectedMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full pl-2 pr-2 py-1"
              >
                <Avatar text={member.avatarText} size="sm" />

                <span className="text-sm text-blue-700">
                  {member.id}
                </span>

                <button
                  onClick={() => onRemoveMember(member.id)}
                  className="text-blue-400 hover:text-red-500"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function UserDropdown({ users, onSelectUser }) {
  return (
    <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden z-50 max-h-64 overflow-y-auto">
      {users.map((user) => (
        <button
          key={user.id}
          onClick={() => onSelectUser(user)}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 text-left"
        >
          <div className="relative">
            <Avatar text={user.avatarText} imageUrl={user.avatarUrl} />

            {user.online && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
            )}
          </div>

          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">
              {user.name}
            </p>

            <p className="text-xs text-gray-500 truncate">
              UID: {user.id}
            </p>

            <p className="text-xs text-gray-400 truncate">
              {user.email}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

export default NewRoomModal;