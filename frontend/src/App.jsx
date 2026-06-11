import { useEffect, useState } from "react";
import LoginPage from "./pages/LoginPage.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import { getStoredUser, getStoredToken, removeStoredUser } from "./api/authApi.js";
import { connectSocket, disconnectSocket } from "./socket/socket.js";
import { checkAdminStatus } from "./api/adminApi.js";
import { updateUserId } from "./api/userApi.js";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [page, setPage] = useState("chat");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const user = getStoredUser();
    const token = getStoredToken();
    if (user && token) {
      setCurrentUser(user);
      connectSocket(token);
      checkAdminStatus().then(setIsAdmin);
    }
  }, []);

  useEffect(() => {
    const getPageLoadDurationMs = () => {
      const [nav] = performance.getEntriesByType("navigation");
      if (nav?.loadEventEnd > 0) {
        return Math.round(nav.loadEventEnd - nav.startTime);
      }

      const { timing } = performance;
      if (timing?.loadEventEnd > 0 && timing.navigationStart > 0) {
        return Math.round(timing.loadEventEnd - timing.navigationStart);
      }

      return Math.round(performance.now());
    };

    const reportPageLoad = () => {
      const duration = getPageLoadDurationMs();
      if (duration <= 0) return;

      fetch(`${BACKEND_URL}/api/metrics/page-load`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duration })
      }).catch((err) => {
        console.debug("Page load metric skipped:", err.message);
      });
    };

    if (document.readyState === "complete") {
      reportPageLoad();
    } else {
      window.addEventListener("load", reportPageLoad, { once: true });
    }
  }, []);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    const token = getStoredToken();
    if (token) {
      connectSocket(token);
      checkAdminStatus().then(setIsAdmin);
    }
  };

  const handleLogout = () => {
    disconnectSocket();
    removeStoredUser();
    setCurrentUser(null);
    setPage("chat");
  };

  const handleUpdateUserId = async (newId) => {
    const result = await updateUserId(newId);
    disconnectSocket();
    setCurrentUser(result.user);
    connectSocket(result.token);
    checkAdminStatus().then(setIsAdmin);
    return result.user;
  };

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  if (page === "admin") {
    return <AdminPage onBack={() => setPage("chat")} />;
  }

  return (
    <ChatPage
      currentUser={currentUser}
      onLogout={handleLogout}
      onOpenAdmin={isAdmin ? () => setPage("admin") : null}
      onUpdateUserId={handleUpdateUserId}
    />
  );
}

export default App;
