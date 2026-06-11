import { GoogleLogin } from "@react-oauth/google";
import { loginWithGoogleCredential } from "../api/authApi.js";

function LoginPage({ onLoginSuccess }) {
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const user = await loginWithGoogleCredential(credentialResponse.credential);
      onLoginSuccess(user);
    } catch (error) {
      console.error(error);
      alert("Google 登入失敗，請稍後再試。");
    }
  };

  const handleGoogleError = () => {
    alert(
      "Google 登入失敗。若瀏覽器曾封鎖第三方登入，請點網址列左側圖示 → 網站設定 → 允許「第三方登入」，或改用無痕視窗再試。"
    );
  };

  return (
    <div
      className="min-h-screen w-screen flex items-center justify-center px-4"
      style={{
        backgroundImage: "url('/tsmc-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative z-10 w-full max-w-md bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8">
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.png" alt="TSMChat" className="w-24 h-24 object-contain mb-4" />

          <h1 className="text-4xl font-bold text-gray-900">
            TSMChat
          </h1>

          <p className="text-gray-500 mt-2 text-center">
            使用 Google 帳號登入，開始即時聊天
          </p>
        </div>

        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            use_fedcm_for_prompt={false}
            use_fedcm_for_button={false}
            ux_mode="popup"
            theme="filled_blue"
            size="large"
            text="signin_with"
            shape="pill"
          />
        </div>

        <div className="mt-6 text-sm text-gray-400 text-center leading-relaxed">
          支援 1 對 1 聊天、群組聊天、通知、上線狀態與 RWD。
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
