import { api } from "/js/api.js"
import { dom } from "/js/dom.js"

const form = dom.qs("#signup-form")
const profileImageInput = dom.qs("#profile-image")
const profilePreview = dom.qs("#profile-preview")
const uploadBtn = dom.qs("#upload-btn")
const sendCodeBtn = dom.qs("#send-code-btn")
const verifyCodeBtn = dom.qs("#verify-code-btn")
const verificationGroup = dom.qs("#verification-group")
const recoverModalOverlay = dom.qs("#recover-modal-overlay")
const recoverYesBtn = dom.qs("#recover-yes-btn")
const recoverNoBtn = dom.qs("#recover-no-btn")

let selectedFile = null
let emailVerified = false
let emailVerifiedToken = null
let isLeavedMember = false
let currentEmail = ""

// Verification code input and button are disabled by default
console.log("🔍 Verification group element:", verificationGroup)
console.log("✅ Verification inputs are disabled initially")

// Validation functions
const validators = {
  name: (value) => {
    if (!value || !value.trim()) {
      return { valid: false, message: "닉네임을 입력해주세요" }
    }
    const trimmedValue = value.trim()
    if (trimmedValue.length < 2) {
      return { valid: false, message: "닉네임은 2자 이상이어야 합니다" }
    }
    if (trimmedValue.length > 12) {
      return { valid: false, message: "닉네임은 12자 이하여야 합니다" }
    }
    return { valid: true, message: "" }
  },
  
  email: (value) => {
    if (!value || !value.trim()) {
      return { valid: false, message: "이메일을 입력해주세요" }
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      return { valid: false, message: "올바른 이메일 형식이 아닙니다" }
    }
    return { valid: true, message: "" }
  },
  
  password: (value) => {
    if (!value) {
      return { valid: false, message: "비밀번호를 입력해주세요" }
    }
    if (value.length < 8) {
      return { valid: false, message: "비밀번호는 8자 이상이어야 합니다" }
    }
    // Check for at least one letter, one number, one special character
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

// Handle profile image upload button
uploadBtn.addEventListener("click", () => {
  profileImageInput.click()
})

// Handle profile image selection
profileImageInput.addEventListener("change", (e) => {
  const file = e.target.files[0]
  if (!file) return

  // Validate file type
  if (!file.type.startsWith("image/")) {
    dom.showToast("이미지 파일만 업로드 가능합니다", "error")
    return
  }

  // Validate file size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    dom.showToast("파일 크기는 5MB 이하여야 합니다", "error")
    return
  }

  selectedFile = file

  // Show preview
  const reader = new FileReader()
  reader.onload = (e) => {
    profilePreview.innerHTML = `<img src="${e.target.result}" alt="Profile preview">`
  }
  reader.readAsDataURL(file)
})

// Handle send verification code
sendCodeBtn.addEventListener("click", async () => {
  const email = dom.qs("#email").value.trim()
  const emailError = dom.qs("#email-error")
  const emailHelper = dom.qs("#email-helper")

  emailError.textContent = ""
  emailHelper.textContent = ""

  if (!email) {
    emailError.textContent = "이메일을 입력해주세요"
    return
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    emailError.textContent = "올바른 이메일 형식이 아닙니다"
    return
  }

  currentEmail = email
  const spinner = dom.showSpinner()

  try {
    // Call API to send verification code
    const response = await api.sendSignupEmailCode(email)
    
    isLeavedMember = response.isLeavedMember || false
    
    if (isLeavedMember) {
      console.log("⚠️ This is a deleted member account. Show recovery modal.")
      dom.hideSpinner(spinner)
      
      // Show recover modal
      recoverModalOverlay.style.display = "flex"
      return
    }
    
    emailHelper.textContent = "인증 코드가 전송되었습니다"
    emailHelper.classList.add("success")
    
    // Enable verification code input and button
    console.log("🔍 Enabling verification inputs...")
    const verificationCodeInput = dom.qs("#verification-code")
    if (verificationCodeInput) {
      verificationCodeInput.disabled = false
      console.log("✅ Verification code input enabled")
    }
    if (verifyCodeBtn) {
      verifyCodeBtn.disabled = false
      console.log("✅ Verify button enabled")
    }
    
    // Disable email input and send button
    dom.qs("#email").disabled = true
    sendCodeBtn.disabled = true
    
    dom.showToast("인증 코드가 이메일로 전송되었습니다")
  } catch (error) {
    emailError.textContent = error.message || "인증 코드 전송에 실패했습니다"
    dom.showToast(error.message || "인증 코드 전송에 실패했습니다", "error")
  } finally {
    dom.hideSpinner(spinner)
  }
})

// Handle verify code
verifyCodeBtn.addEventListener("click", async () => {
  const email = dom.qs("#email").value.trim()
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
    // Call API to verify code
    const response = await api.verifySignupEmailCode(email, code)
    
    emailVerifiedToken = response.emailVerifiedToken
    emailVerified = true
    
    verificationHelper.textContent = "이메일 인증이 완료되었습니다"
    verificationHelper.classList.add("success")
    
    // Disable verification inputs after successful verification
    const verificationCodeInput = dom.qs("#verification-code")
    if (verificationCodeInput) {
      verificationCodeInput.disabled = true
    }
    if (verifyCodeBtn) {
      verifyCodeBtn.disabled = true
    }
    
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

// Handle recover modal - Yes button (go to recover page)
recoverYesBtn.addEventListener("click", () => {
  window.location.href = `/recover?email=${encodeURIComponent(currentEmail)}`
})

// Handle recover modal - No button (resend code as normal signup)
recoverNoBtn.addEventListener("click", async () => {
  // Hide modal
  recoverModalOverlay.style.display = "none"
  
  const spinner = dom.showSpinner()
  const emailError = dom.qs("#email-error")
  const emailHelper = dom.qs("#email-helper")
  
  try {
    // Resend code without leaved member check
    await api.resendSignupEmailCode(currentEmail)
    
    emailHelper.textContent = "인증 코드가 전송되었습니다"
    emailHelper.classList.add("success")
    
    // Enable verification code input and button
    const verificationCodeInput = dom.qs("#verification-code")
    if (verificationCodeInput) {
      verificationCodeInput.disabled = false
    }
    if (verifyCodeBtn) {
      verifyCodeBtn.disabled = false
    }
    
    // Disable email input and send button
    dom.qs("#email").disabled = true
    sendCodeBtn.disabled = true
    
    dom.showToast("인증 코드가 이메일로 전송되었습니다")
  } catch (error) {
    emailError.textContent = error.message || "인증 코드 전송에 실패했습니다"
    dom.showToast(error.message || "인증 코드 전송에 실패했습니다", "error")
  } finally {
    dom.hideSpinner(spinner)
  }
})

// Reset verification when email changes
dom.qs("#email").addEventListener("input", () => {
  emailVerified = false
  emailVerifiedToken = null
  isLeavedMember = false
  currentEmail = ""
  
  const emailHelper = dom.qs("#email-helper")
  emailHelper.textContent = ""
  emailHelper.classList.remove("success")
  
  // Reset and disable verification inputs
  const verificationCodeInput = dom.qs("#verification-code")
  if (verificationCodeInput) {
    verificationCodeInput.value = ""
    verificationCodeInput.disabled = true
  }
  dom.qs("#verification-error").textContent = ""
  dom.qs("#verification-helper").textContent = ""
  dom.qs("#verification-helper").classList.remove("success")
  if (verifyCodeBtn) {
    verifyCodeBtn.disabled = true
  }
  
  // Re-enable email input and send button
  dom.qs("#email").disabled = false
  sendCodeBtn.disabled = false
  
  // Clear validation state on input
  const emailInput = dom.qs("#email")
  emailInput.classList.remove("valid", "invalid")
  dom.qs("#email-error").textContent = ""
})

// Add blur event listeners for real-time validation
dom.qs("#name").addEventListener("blur", () => {
  validateField("name", validators.name)
})

dom.qs("#email").addEventListener("blur", () => {
  validateField("email", validators.email)
})

dom.qs("#password").addEventListener("blur", () => {
  validateField("password", validators.password)
  
  // Also re-validate password confirm if it has a value
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
const inputs = ["name", "email", "password", "password-confirm"]
inputs.forEach(id => {
  dom.qs(`#${id}`)?.addEventListener("focus", () => {
    const input = dom.qs(`#${id}`)
    input.classList.remove("valid", "invalid")
  })
})

// Handle form submission
form.addEventListener("submit", async (e) => {
  e.preventDefault()

  const name = dom.qs("#name").value.trim()
  const email = dom.qs("#email").value.trim()
  const password = dom.qs("#password").value
  const passwordConfirm = dom.qs("#password-confirm").value

  // Validate all fields
  const isNameValid = validateField("name", validators.name)
  const isEmailValid = validateField("email", validators.email)
  const isPasswordValid = validateField("password", validators.password)
  const isPasswordConfirmValid = validateField("password-confirm", validators.passwordConfirm, password)

  // Check email verification
  if (isEmailValid && !emailVerified) {
    dom.qs("#email-error").textContent = "이메일 인증을 완료해주세요"
    dom.qs("#email").classList.add("invalid")
  }

  // Stop if any validation failed
  if (!isNameValid || !isEmailValid || !emailVerified || !isPasswordValid || !isPasswordConfirmValid) {
    return
  }

  const spinner = dom.showSpinner()

  try {
    let imageObjectKey = null

    if (selectedFile) {
      try {
        // Get presigned URL for profile image
        const presignedData = await api.getProfilePresignedUrl(selectedFile.name, selectedFile.type)

        // Upload to S3
        await api.uploadToS3(selectedFile, presignedData.presignedUrl)

        // Store the object key
        imageObjectKey = presignedData.objectKey
      } catch (error) {
        console.error("Image upload error:", error)
        dom.showToast("이미지 업로드에 실패했습니다", "error")
      }
    }

    await api.register({
      email,
      password,
      name,
      imageObjectKey,
      emailVerifiedToken,
    })

    dom.showToast("회원가입이 완료되었습니다!")

    setTimeout(() => {
      window.location.href = "/login"
    }, 1000)
  } catch (error) {
    dom.showToast(error.message || "회원가입에 실패했습니다", "error")
  } finally {
    dom.hideSpinner(spinner)
  }
})
