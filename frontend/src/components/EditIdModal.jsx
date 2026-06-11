import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

function EditIdModal({ currentUser, onClose, onSave }) {
  const [newId, setNewId] = useState(currentUser.id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    const trimmed = newId.trim();
    if (!trimmed) {
      setError("ID 不能為空。");
      return;
    }

    if (trimmed === currentUser.id) {
      onClose();
      return;
    }

    try {
      setSaving(true);
      setError("");
      await onSave(trimmed);
      onClose();
    } catch (err) {
      setError(err.message || "更新 ID 失敗。");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">變更 User ID</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          這是其他使用者搜尋與識別你的 ID。可使用英文、數字、底線、點或連字號。
        </p>

        <input
          value={newId}
          onChange={(event) => setNewId(event.target.value)}
          className="w-full bg-gray-100 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-400 mb-2"
          placeholder="例如 henrychiu412"
        />

        {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-3 rounded-2xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "儲存中..." : "儲存"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default EditIdModal;
