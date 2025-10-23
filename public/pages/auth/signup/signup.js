import { api } from "/js/api.js"
import { dom } from "/js/dom.js"

const form = dom.qs("#signup-form")
const profileImageInput = dom.qs("#profile-image")
const profilePreview = dom.qs("#profile-preview")
const uploadBtn = dom.qs("#upload-btn")
const checkEmailBtn = dom.qs("#check-email-btn")

let selectedFile = null
let emailChecked = false

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

// Handle email duplicate check
checkEmailBtn.addEventListener("click", async () => {
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

  try {
    // Call API to check email duplication
    const result = await api.checkEmailDuplicate(email)
    
    // If result is true or the API returns success, email is available
    emailHelper.textContent = "사용 가능한 이메일입니다"
    emailHelper.classList.add("success")
    emailChecked = true
  } catch (error) {
    emailError.textContent = "이미 사용 중인 이메일입니다"
    emailChecked = false
  }
})

// Reset email check when email changes
dom.qs("#email").addEventListener("input", () => {
  emailChecked = false
  const emailHelper = dom.qs("#email-helper")
  emailHelper.textContent = ""
  emailHelper.classList.remove("success")
})

// Handle form submission
form.addEventListener("submit", async (e) => {
  e.preventDefault()

  // Clear previous errors
  document.querySelectorAll(".form-error").forEach((el) => (el.textContent = ""))

  const name = dom.qs("#name").value.trim()
  const email = dom.qs("#email").value.trim()
  const password = dom.qs("#password").value
  const passwordConfirm = dom.qs("#password-confirm").value

  // Validation
  let hasError = false

  if (!name) {
    dom.qs("#name-error").textContent = "이름을 입력해주세요"
    hasError = true
  }

  if (!email) {
    dom.qs("#email-error").textContent = "이메일을 입력해주세요"
    hasError = true
  }

  if (!emailChecked) {
    dom.qs("#email-error").textContent = "이메일 중복검사를 해주세요"
    hasError = true
  }

  if (!password) {
    dom.qs("#password-error").textContent = "비밀번호를 입력해주세요"
    hasError = true
  } else if (password.length < 8) {
    dom.qs("#password-error").textContent = "비밀번호는 8자 이상이어야 합니다"
    hasError = true
  }

  if (password !== passwordConfirm) {
    dom.qs("#password-confirm-error").textContent = "비밀번호가 일치하지 않습니다"
    hasError = true
  }

  if (hasError) return

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
