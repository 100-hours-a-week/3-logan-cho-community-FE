import { api } from "/js/api.js"
import { storage } from "/js/storage.js"
import { dom } from "/js/dom.js"
import { config } from "/js/config.js"

// Redirect if already logged in
if (storage.hasToken()) {
  window.location.href = "/"
}

const form = dom.qs("#login-form")
const emailInput = dom.qs("#email")
const passwordInput = dom.qs("#password")
const googleLoginBtn = dom.qs("#google-login-btn")

// Handle form submission
form.addEventListener("submit", async (e) => {
  e.preventDefault()

  // Clear previous errors
  dom.qs("#email-error").textContent = ""
  dom.qs("#password-error").textContent = ""

  const email = emailInput.value.trim()
  const password = passwordInput.value

  // Basic validation
  if (!email) {
    dom.qs("#email-error").textContent = "이메일을 입력해주세요"
    return
  }

  if (!password) {
    dom.qs("#password-error").textContent = "비밀번호를 입력해주세요"
    return
  }

  const spinner = dom.showSpinner()

  try {
    const data = await api.login(email, password, navigator.userAgent)

    // Store access token from response data
    if (data && data.accessJwt) {
      storage.setToken(data.accessJwt)
    }

    dom.showToast("로그인 성공!")

    setTimeout(() => {
      window.location.href = "/"
    }, 500)
  } catch (error) {
    dom.showToast(error.message || "로그인에 실패했습니다", "error")
  } finally {
    dom.hideSpinner(spinner)
  }
})

// Handle Google login
googleLoginBtn.addEventListener("click", () => {
  // Redirect to backend OAuth endpoint
  window.location.href = `${config.API_BASE_URL}/oauth2/authorization/google`
})
