import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Users,
  MessageSquare,
  Hash,
  RefreshCw,
  Wifi,
  WifiOff,
  Clock,
  Activity,
  AlertTriangle,
  Trash2,
  UserX
} from "lucide-react";
import {
  fetchAdminDashboard,
  adminDeleteUser,
  adminDeleteRoomMessages,
  adminClearAllMessages,
  fetchAlerts
} from "../api/adminApi.js";
import { getSocket } from "../socket/socket.js";
import { formatTaipeiTime } from "../utils/time.js";
import { filterVisibleAlerts } from "../utils/alerts.js";

function AdminPage({ onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [refreshing, setRefreshing] = useState(false);
  const [alerts, setAlerts] = useState([]);

  const loadData = async () => {
    try {
      setRefreshing(true);
      const [result, alertList] = await Promise.all([
        fetchAdminDashboard(),
        fetchAlerts().catch(() => [])
      ]);
      setData(result);
      setAlerts(alertList);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleUserOnline = ({ userId }) => {
      setData((prev) => applyPresenceUpdate(prev, userId, true));
    };

    const handleUserOffline = ({ userId }) => {
      setData((prev) => applyPresenceUpdate(prev, userId, false));
    };

    const handleAlert = (latestAlerts) => {
      setAlerts((prev) => {
        const byId = new Map(prev.map((a) => [a.id, a]));
        for (const a of latestAlerts) {
          byId.set(a.id, a);
        }
        return Array.from(byId.values())
          .sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt))
          .slice(0, 200);
      });
    };

    socket.on("user_online", handleUserOnline);
    socket.on("user_offline", handleUserOffline);
    socket.on("admin_alert", handleAlert);
    return () => {
      socket.off("user_online", handleUserOnline);
      socket.off("user_offline", handleUserOffline);
      socket.off("admin_alert", handleAlert);
    };
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500 text-lg">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto mb-3 text-red-400" size={48} />
          <p className="text-red-500 text-lg mb-4">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const visibleAlerts = filterVisibleAlerts(alerts, data?.overview?.onlineUsers ?? 0);
  const firingCount = visibleAlerts.filter((a) => a.status === "firing").length;

  const tabs = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "users", label: "Users", icon: Users },
    { id: "groups", label: "Groups", icon: Hash },
    { id: "messages", label: "Messages", icon: MessageSquare },
    { id: "alerts", label: firingCount > 0 ? `Alerts (${firingCount})` : "Alerts", icon: AlertTriangle }
  ];

  return (
    <div className="h-screen w-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
            title="Back to Chat"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-gray-900">TSMChat Admin Dashboard</h1>
          
        </div>

        <button
          onClick={loadData}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 disabled:opacity-50"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </header>

      <nav className="bg-white border-b border-gray-200 px-6 flex gap-1 shrink-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      <main className="flex-1 overflow-y-auto p-6">
        {activeTab === "overview" && <OverviewTab data={data} alerts={visibleAlerts} />}
        {activeTab === "users" && <UsersTab data={data} onRefresh={loadData} />}
        {activeTab === "groups" && <GroupsTab data={data} onRefresh={loadData} />}
        {activeTab === "messages" && <MessagesTab data={data} onRefresh={loadData} />}
        {activeTab === "alerts" && <AlertsTab alerts={visibleAlerts} onlineUsers={data?.overview?.onlineUsers ?? 0} />}
      </main>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color = "blue" }) {
  const colorMap = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    orange: "bg-orange-50 text-orange-600"
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <div className={`p-2 rounded-lg ${colorMap[color]}`}>
          <Icon size={18} />
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

function OverviewTab({ data, alerts }) {
  const { overview, metrics } = data;
  const firingAlerts = alerts.filter((a) => a.status === "firing");

  const formatUptime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={overview.totalUsers} icon={Users} color="blue" />
        <StatCard label="Active on TSMChat" value={overview.onlineUsers} icon={Wifi} color="green" />
        <StatCard label="Groups" value={overview.totalChatrooms} icon={Hash} color="purple" />
        <StatCard label="Total Messages" value={overview.totalMessages} icon={MessageSquare} color="orange" />
      </div>

      {firingAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
            <AlertTriangle size={16} />
            {firingAlerts.length} Active Alert{firingAlerts.length > 1 ? "s" : ""}
          </h3>
          <div className="space-y-2">
            {firingAlerts.slice(0, 5).map((a) => (
              <div key={a.id} className="flex items-center gap-3 text-sm">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  a.severity === "critical" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                }`}>
                  {a.severity}
                </span>
                <span className="font-medium text-red-800">{a.name}</span>
                <span className="text-red-600">{a.summary}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">System Metrics</h2>
          </div>
          <div className="p-5">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                <MetricRow label="Live Connections" value={metrics.wsConnectionsActive} />
                <MetricRow label="Users Online (active tab)" value={metrics.usersOnlineTotal} />
                <MetricRow label="API Requests" value={metrics.httpRequestsTotal} />
                <MetricRow label="Total Messages" value={metrics.messagesSentTotal} />
                <MetricRow label="Active Alerts" value={metrics.errorsTotal} />
                <MetricRow label="Server Uptime" value={formatUptime(metrics.uptimeSeconds)} />
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">
              Active Users ({data.onlineUserIds.length})
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Only users with TSMChat open and in focus
            </p>
          </div>
          <div className="p-5">
            {data.onlineUserIds.length === 0 ? (
              <p className="text-sm text-gray-400">No users actively viewing TSMChat</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {data.onlineUserIds.map((userId) => {
                  const user = data.users.find((u) => u.id === userId);
                  return (
                    <span
                      key={userId}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium"
                    >
                      <span className="w-2 h-2 bg-green-500 rounded-full" />
                      {user ? user.name : userId}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricRow({ label, value }) {
  return (
    <tr>
      <td className="py-2.5 text-gray-600">{label}</td>
      <td className="py-2.5 text-right font-medium text-gray-900">{value}</td>
    </tr>
  );
}

function UsersTab({ data, onRefresh }) {
  const { users } = data;
  const [deleting, setDeleting] = useState(null);

  const handleDelete = async (user) => {
    if (!window.confirm(`Delete user "${user.name}" (${user.email})?\n\nThis will remove them and all their group memberships. This cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(user.id);
      await adminDeleteUser(user.id);
      await onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = formatTaipeiTime;

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">All Registered Users</h2>
        <span className="text-sm text-gray-500">{users.length} total</span>
      </div>

      {users.length === 0 ? (
        <div className="p-8 text-center text-gray-400 text-sm">No users registered yet</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 font-medium">ID</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Registered</th>
                <th className="px-5 py-3 font-medium w-20">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                        {user.avatarText || "?"}
                      </div>
                      <span className="font-medium text-gray-900">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-600 font-mono text-xs">{user.id}</td>
                  <td className="px-5 py-3 text-gray-600">{user.email}</td>
                  <td className="px-5 py-3">
                    {user.online ? (
                      <span className="inline-flex items-center gap-1.5 text-green-600 text-xs font-medium">
                        <Wifi size={12} /> Online
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-gray-400 text-xs font-medium">
                        <WifiOff size={12} /> Offline
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{formatDate(user.createdAt)}</td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => handleDelete(user)}
                      disabled={deleting === user.id}
                      className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 transition-colors"
                      title={`Delete ${user.name}`}
                    >
                      <UserX size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function GroupsTab({ data, onRefresh }) {
  const { chatrooms } = data;
  const [deletingMsgs, setDeletingMsgs] = useState(null);

  const handleDeleteMessages = async (room) => {
    if (!window.confirm(`Clear all messages in "${room.name}"?\n\nThis cannot be undone.`)) {
      return;
    }

    try {
      setDeletingMsgs(room.id);
      await adminDeleteRoomMessages(room.id);
      await onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setDeletingMsgs(null);
    }
  };

  const formatDate = formatTaipeiTime;

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">All Groups</h2>
        <span className="text-sm text-gray-500">{chatrooms.length} total</span>
      </div>

      {chatrooms.length === 0 ? (
        <div className="p-8 text-center text-gray-400 text-sm">No groups created yet</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Members</th>
                <th className="px-5 py-3 font-medium">Online</th>
                <th className="px-5 py-3 font-medium">Last Message</th>
                <th className="px-5 py-3 font-medium">Created By</th>
                <th className="px-5 py-3 font-medium">Updated</th>
                <th className="px-5 py-3 font-medium w-24">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {chatrooms.map((room) => (
                <tr key={room.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Hash size={14} className="text-gray-400" />
                      <span className="font-medium text-gray-900">{room.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        room.type === "group"
                          ? "bg-purple-50 text-purple-700"
                          : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      {room.type === "group" ? "Group" : "Direct"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div>
                      <span className="text-gray-900 font-medium">{room.memberCount}</span>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {room.members.map((m) => m.name).join(", ")}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                        (room.onlineCount ?? 0) > 0 ? "text-green-600" : "text-gray-400"
                      }`}
                    >
                      {(room.onlineCount ?? 0) > 0 ? <Wifi size={12} /> : <WifiOff size={12} />}
                      {room.onlineCount ?? 0} / {room.memberCount}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600 max-w-[200px] truncate">
                    {room.lastMessage || "-"}
                  </td>
                  <td className="px-5 py-3 text-gray-600 font-mono text-xs">{room.createdBy}</td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{formatDate(room.updatedAt)}</td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => handleDeleteMessages(room)}
                      disabled={deletingMsgs === room.id}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded text-red-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-30 transition-colors"
                      title={`Clear messages in ${room.name}`}
                    >
                      <Trash2 size={12} />
                      Clear
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MessagesTab({ data, onRefresh }) {
  const { recentMessages } = data;
  const [clearing, setClearing] = useState(false);

  const handleClearAll = async () => {
    if (!window.confirm("Clear ALL messages across every group?\n\nThis cannot be undone.")) {
      return;
    }

    try {
      setClearing(true);
      await adminClearAllMessages();
      await onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setClearing(false);
    }
  };

  const formatDate = formatTaipeiTime;

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">Recent Messages (All Groups)</h2>
          <p className="text-xs text-gray-400 mt-0.5">Showing up to 50 most recent</p>
        </div>
        {recentMessages.length > 0 && (
          <button
            onClick={handleClearAll}
            disabled={clearing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-medium disabled:opacity-30 transition-colors"
          >
            <Trash2 size={12} />
            {clearing ? "Clearing..." : "Clear All Messages"}
          </button>
        )}
      </div>

      {recentMessages.length === 0 ? (
        <div className="p-8 text-center text-gray-400 text-sm">No messages yet</div>
      ) : (
        <div className="divide-y divide-gray-100">
          {recentMessages.map((msg) => (
            <div key={msg.id} className="px-5 py-3 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3 mb-1">
                <span className="font-medium text-gray-900 text-sm">{msg.senderName}</span>
                <span className="text-xs text-gray-400 font-mono">({msg.senderId})</span>
                <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-500">
                  {msg.roomName}
                </span>
                <span className="text-xs text-gray-400 ml-auto flex items-center gap-1">
                  <Clock size={10} />
                  {formatDate(msg.createdAt)}
                </span>
              </div>
              <p className="text-sm text-gray-700">{msg.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AlertsTab({ alerts, onlineUsers = 0 }) {
  const formatDate = formatTaipeiTime;

  const firing = alerts.filter((a) => a.status === "firing");
  const resolved = alerts.filter((a) => a.status === "resolved");

  return (
    <div className="space-y-6">
      {/* Firing Alerts */}
      <div className={`rounded-xl border ${firing.length > 0 ? "border-red-200 bg-white" : "border-gray-200 bg-white"}`}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${firing.length > 0 ? "bg-red-500 animate-pulse" : "bg-green-500"}`} />
            {firing.length > 0 ? `Firing Alerts (${firing.length})` : "All Clear — No Active Alerts"}
          </h2>
        </div>

        {firing.length === 0 ? (
          <div className="p-8 text-center text-green-600 text-sm font-medium">
            {onlineUsers === 0
              ? "No users online — operational alerts are paused."
              : "All systems healthy. No alerts firing."}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {firing.map((alert) => (
              <div key={alert.id} className="px-5 py-4 hover:bg-red-50 transition-colors">
                <div className="flex items-center gap-3 mb-1.5">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                    alert.severity === "critical" ? "bg-red-100 text-red-700" :
                    alert.severity === "warning" ? "bg-yellow-100 text-yellow-700" :
                    "bg-blue-100 text-blue-700"
                  }`}>
                    {alert.severity}
                  </span>
                  <span className="font-semibold text-gray-900">{alert.name}</span>
                  <span className="text-xs text-gray-400 ml-auto flex items-center gap-1">
                    <Clock size={10} />
                    Started: {formatDate(alert.startsAt)}
                  </span>
                </div>
                <p className="text-sm font-medium text-red-700">{alert.summary}</p>
                {alert.description && (
                  <p className="text-xs text-gray-500 mt-1">{alert.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolved Alerts History */}
      {resolved.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">
              Resolved Alerts History ({resolved.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {resolved.slice(0, 30).map((alert) => (
              <div key={alert.id} className="px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3 mb-1">
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                    resolved
                  </span>
                  <span className="font-medium text-gray-700 text-sm">{alert.name}</span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {formatDate(alert.receivedAt)}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{alert.summary}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {alerts.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <AlertTriangle className="mx-auto mb-3 text-gray-300" size={40} />
          <p className="text-gray-400 text-sm">No alert history yet. Alerts will appear here when triggered.</p>
          <p className="text-gray-300 text-xs mt-2">
            Monitoring: error rate, latency, CPU, memory, backend health, page load speed
          </p>
        </div>
      )}
    </div>
  );
}

export default AdminPage;

function applyPresenceUpdate(prev, userId, online) {
  if (!prev) return prev;

  const alreadyOnline = prev.onlineUserIds.includes(userId);
  if (online === alreadyOnline) return prev;

  const onlineUserIds = online
    ? [...prev.onlineUserIds, userId]
    : prev.onlineUserIds.filter((id) => id !== userId);

  const users = prev.users.map((user) =>
    user.id === userId ? { ...user, online } : user
  );

  const chatrooms = prev.chatrooms.map((room) => {
    const isMember = room.members.some((member) => member.id === userId);
    if (!isMember) return room;

    const onlineCount = online
      ? (room.onlineCount ?? 0) + 1
      : Math.max(0, (room.onlineCount ?? 0) - 1);

    return { ...room, onlineCount };
  });

  return {
    ...prev,
    onlineUserIds,
    users,
    chatrooms,
    overview: {
      ...prev.overview,
      onlineUsers: onlineUserIds.length
    }
  };
}
