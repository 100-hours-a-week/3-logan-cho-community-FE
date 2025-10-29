import { api } from "/js/api.js"
import { dom } from "/js/dom.js"

const form = dom.qs("#recover-form")
const resendCodeBtn = dom.qs("#resend-code-btn")
const verifyCodeBtn = dom.qs("#verify-code-btn")
const verificationGroup = dom.qs("#verification-group")

let emailVerified = false
let emailVerifiedToken = null
let currentEmail = ""

// Get email from URL parameter
const urlParams = new URLSearchParams(window.location.search)
const emailParam = urlParams.get("email")

if (!emailParam) {
  dom.showToast("이메일 정보가 없습니다", "error")
  setTimeout(() => {
    window.location.href = "/signup"
  }, 1500)
} else {
  currentEmail = emailParam
  dom.qs("#email").value = currentEmail
  
  // Automatically send verification code on page load
  sendVerificationCode()
}

// Validation functions
const validators = {
  password: (value) => {
    if (!value) {
      return { valid: false, message: "비밀번호를 입력해주세요" }
    }
    if (value.length < 8) {
      return { valid: false, message: "비밀번호는 8자 이상이어야 합니다" }
    }
    const hasLetter = /[a-zA-Z]/.test(value)
    const hasNumber = /\d/.test(value)
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(value)
    
    if (!hasLetter || !hasNumber || !hasSpecial) {
      return { valid: false, message: "영문, 숫자, 특수문자를 모두 포함해야 합니다" }
    }
    return { valid: true, message: "" }
  },
  
  passwordConfirm: (value, password) => {
    if (!value) {
      return { valid: false, message: "비밀번호 확인을 입력해주세요" }
    }
    if (value !== password) {
      return { valid: false, message: "비밀번호가 일치하지 않습니다" }
    }
    return { valid: true, message: "" }
  }
}

// Validate field and show error
function validateField(fieldId, validator, ...args) {
  const input = dom.qs(`#${fieldId}`)
  const errorEl = dom.qs(`#${fieldId}-error`)
  
  if (!input || !errorEl) return true
  
  const result = validator(input.value, ...args)
  
  errorEl.textContent = result.message
  
  if (result.valid) {
    input.classList.remove("invalid")
    input.classList.add("valid")
  } else {
    input.classList.remove("valid")
    input.classList.add("invalid")
  }
  
  return result.valid
}

// Send verification code
async function sendVerificationCode() {
  const spinner = dom.showSpinner()
  
  try {
    await api.sendRecoverEmailCode(currentEmail)
    
    dom.showToast("인증 코드가 이메일로 전송되었습니다")
    
    // Enable verification code input and button
    const verificationCodeInput = dom.qs("#verification-code")
    if (verificationCodeInput) {
      verificationCodeInput.disabled = false
    }
    if (verifyCodeBtn) {
      verifyCodeBtn.disabled = false
    }
  } catch (error) {
    dom.showToast(error.message || "인증 코드 전송에 실패했습니다", "error")
  } finally {
    dom.hideSpinner(spinner)
  }
}

// Handle resend code button
resendCodeBtn.addEventListener("click", async () => {
  const spinner = dom.showSpinner()
  
  try {
    await api.sendRecoverEmailCode(currentEmail)
    
    dom.showToast("인증 코드가 재전송되었습니다")
    
    // Enable verification code input and button
    const verificationCodeInput = dom.qs("#verification-code")
    if (verificationCodeInput) {
      verificationCodeInput.disabled = false
      verificationCodeInput.value = "" // Clear previous code
    }
    if (verifyCodeBtn) {
      verifyCodeBtn.disabled = false
    }
  } catch (error) {
    dom.showToast(error.message || "인증 코드 재전송에 실패했습니다", "error")
  } finally {
    dom.hideSpinner(spinner)
  }
})

// Handle verify code
verifyCodeBtn.addEventListener("click", async () => {
  const code = dom.qs("#verification-code").value.trim()
  const verificationError = dom.qs("#verification-error")
  const verificationHelper = dom.qs("#verification-helper")

  verificationError.textContent = ""
  verificationHelper.textContent = ""

  if (!code) {
    verificationError.textContent = "인증 코드를 입력해주세요"
    return
  }

  const spinner = dom.showSpinner()

  try {
    const response = await api.verifyRecoverEmailCode(currentEmail, code)
    
    emailVerifiedToken = response.emailVerifiedToken
    emailVerified = true
    
    verificationHelper.textContent = "이메일 인증이 완료되었습니다"
    verificationHelper.classList.add("success")
    
    // Disable verification inputs
    const verificationCodeInput = dom.qs("#verification-code")
    if (verificationCodeInput) {
      verificationCodeInput.disabled = true
    }
    if (verifyCodeBtn) {
      verifyCodeBtn.disabled = true
    }
    
    // Enable password inputs
    dom.qs("#password").disabled = false
    dom.qs("#password-confirm").disabled = false
    
    dom.showToast("이메일 인증이 완료되었습니다")
  } catch (error) {
    verificationError.textContent = error.message || "인증 코드가 올바르지 않습니다"
    emailVerified = false
    emailVerifiedToken = null
    dom.showToast(error.message || "인증 코드 검증에 실패했습니다", "error")
  } finally {
    dom.hideSpinner(spinner)
  }
})

// Add blur event listeners for real-time validation
dom.qs("#password").addEventListener("blur", () => {
  validateField("password", validators.password)
  
  const passwordConfirm = dom.qs("#password-confirm")
  if (passwordConfirm.value) {
    validateField("password-confirm", validators.passwordConfirm, dom.qs("#password").value)
  }
})

dom.qs("#password-confirm").addEventListener("blur", () => {
  const password = dom.qs("#password").value
  validateField("password-confirm", validators.passwordConfirm, password)
})

// Clear validation on focus
const inputs = ["password", "password-confirm"]
inputs.forEach(id => {
  dom.qs(`#${id}`)?.addEventListener("focus", () => {
    const input = dom.qs(`#${id}`)
    input.classList.remove("valid", "invalid")
  })
})

// Handle form submission
form.addEventListener("submit", async (e) => {
  e.preventDefault()

  const password = dom.qs("#password").value
  const passwordConfirm = dom.qs("#password-confirm").value

  // Validate all fields
  const isPasswordValid = validateField("password", validators.password)
  const isPasswordConfirmValid = validateField("password-confirm", validators.passwordConfirm, password)

  // Check email verification
  if (!emailVerified) {
    dom.showToast("이메일 인증을 완료해주세요", "error")
    return
  }

  // Stop if any validation failed
  if (!isPasswordValid || !isPasswordConfirmValid) {
    return
  }

  const spinner = dom.showSpinner()

  try {
    // Note: API expects verificationCode parameter (which is our emailVerifiedToken)
    await api.recoverMember(currentEmail, password, emailVerifiedToken)

    dom.showToast("회원 복구가 완료되었습니다!")

    setTimeout(() => {
      window.location.href = "/login"
    }, 1000)
  } catch (error) {
    dom.showToast(error.message || "회원 복구에 실패했습니다", "error")
  } finally {
    dom.hideSpinner(spinner)
  }
})

