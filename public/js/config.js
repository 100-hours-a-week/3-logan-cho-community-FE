// Load environment configuration
// In production, these would be injected at build time
const isProd = window.location.hostname !== "localhost"

export const config = {
  API_BASE_URL: isProd
    ? "http://3.35.185.103:8080"   // 실제 IP로 변경
    : "http://localhost:8080",
  APP_NAME: "Kaboocam",
}
