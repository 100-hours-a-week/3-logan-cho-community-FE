import { api } from "/js/api.js"
import { storage } from "/js/storage.js"
import { dom } from "/js/dom.js"
import { cdn } from "/js/cdn.js"

// Redirect if not logged in (only if on mypage.html)
const isMyPageRoute = window.location.pathname.includes("/mypage")
if (!storage.hasToken() && isMyPageRoute) {
  window.location.href = "/login"
}

// DOM elements
const profileImage = dom.qs("#profile-image")
const profileName = dom.qs("#profile-name")
const profileEmail = dom.qs("#profile-email")
const profileImageInput = dom.qs("#profile-image-input")
const profileImageContainer = dom.qs(".profile-image-container")

const changeNicknameLink = dom.qs("#change-nickname-link")
const nicknameModal = dom.qs("#nickname-modal")
const closeNicknameModal = dom.qs("#close-nickname-modal")
const nicknameForm = dom.qs("#nickname-form")
const nicknameInput = dom.qs("#nickname-input")
const cancelNicknameBtn = dom.qs("#cancel-nickname-btn")

const changePasswordLink = dom.qs("#change-password-link")
const passwordModal = dom.qs("#password-modal")
const closePasswordModal = dom.qs("#close-password-modal")
const passwordForm = dom.qs("#password-form")
const cancelPasswordBtn = dom.qs("#cancel-password-btn")

const deleteAccountLink = dom.qs("#delete-account-link")
const deleteModal = dom.qs("#delete-modal")
const closeDeleteModal = dom.qs("#close-delete-modal")
const cancelDeleteBtn = dom.qs("#cancel-delete-btn")
const confirmDeleteBtn = dom.qs("#confirm-delete-btn")

const logoutBtn = dom.qs("#logout-btn")

let selectedFile = null

// Load user profile
async function loadProfile() {
  try {
    const profile = await api.getProfile()

    // Update display - profile image with CDN
    if (profile.imageObjectKey) {
      // For mypage, we might need CDN base URL - check if it's provided
      // If not, try to use the image object key directly or with a CDN helper
      try {
        // First try to load the image directly
        profileImage.src = profile.imageObjectKey
        
        // If it fails, we'll handle it in the error event
        profileImage.addEventListener("error", async () => {
          try {
            // Try to get CDN URL if available
            // For now, use placeholder as fallback
            profileImage.src = "/user-profile-illustration.png"
          } catch (err) {
            console.error("Failed to load profile image:", err)
            profileImage.src = "/user-profile-illustration.png"
          }
        }, { once: true })
      } catch (error) {
        console.error("Profile image error:", error)
        profileImage.src = "/user-profile-illustration.png"
      }
    } else {
      profileImage.src = "/user-profile-illustration.png"
    }
    
    profileName.textContent = profile.name
    profileEmail.textContent = profile.email || "이메일 정보 없음"

    // Store user info
    storage.setUser(profile)
  } catch (error) {
    console.error("Failed to load profile:", error)
    dom.showToast("프로필을 불러오는데 실패했습니다", "error")
  }
}

// Image change functionality
profileImageContainer.addEventListener("click", () => {
  profileImageInput.click()
})

profileImageInput.addEventListener("change", async (e) => {
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
  const spinner = dom.showSpinner()

  try {
    const presignedData = await api.getProfilePresignedUrl(file.name, file.type)

    // Upload to S3
    await api.uploadToS3(file, presignedData.presignedUrl)

    await api.updateProfileImage(presignedData.objectKey)

    dom.showToast("프로필 이미지가 변경되었습니다")

    // Reload profile
    await loadProfile()

    // Reset input
    profileImageInput.value = ""
    selectedFile = null
  } catch (error) {
    console.error("Image upload error:", error)
    dom.showToast(error.message || "이미지 변경에 실패했습니다", "error")
  } finally {
    dom.hideSpinner(spinner)
  }
})

// Nickname change modal functionality
changeNicknameLink.addEventListener("click", () => {
  nicknameModal.style.display = "flex"
  document.body.style.overflow = "hidden"
  nicknameInput.value = profileName.textContent
  nicknameInput.focus()
})

closeNicknameModal.addEventListener("click", closeNicknameModalFunc)
cancelNicknameBtn.addEventListener("click", closeNicknameModalFunc)

// Close nickname modal when clicking overlay
nicknameModal.addEventListener("click", (e) => {
  if (e.target === nicknameModal) {
    closeNicknameModalFunc()
  }
})

function closeNicknameModalFunc() {
  nicknameModal.style.display = "none"
  document.body.style.overflow = "auto"
  nicknameInput.value = ""
  dom.qs("#nickname-error").textContent = ""
}

// Nickname validation
function validateNickname(value) {
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
}

// Real-time validation on blur
nicknameInput?.addEventListener("blur", () => {
  const errorElement = dom.qs("#nickname-error")
  if (!errorElement) return
  
  const result = validateNickname(nicknameInput.value)
  errorElement.textContent = result.message
  
  if (result.valid) {
    nicknameInput.classList.remove("invalid")
    nicknameInput.classList.add("valid")
  } else {
    nicknameInput.classList.remove("valid")
    nicknameInput.classList.add("invalid")
  }
})

// Clear validation on focus
nicknameInput?.addEventListener("focus", () => {
  const errorElement = dom.qs("#nickname-error")
  if (errorElement) {
    errorElement.textContent = ""
  }
  nicknameInput.classList.remove("valid", "invalid")
})

nicknameForm?.addEventListener("submit", async (e) => {
  e.preventDefault()

  const newNickname = nicknameInput.value.trim()
  const errorElement = dom.qs("#nickname-error")

  // Validate
  const result = validateNickname(newNickname)
  if (!result.valid) {
    errorElement.textContent = result.message
    nicknameInput.classList.add("invalid")
    return
  }

  const spinner = dom.showSpinner()

  try {
    await api.updateName(newNickname)

    dom.showToast("닉네임이 변경되었습니다")

    // Reload profile
    await loadProfile()

    // Close modal
    closeNicknameModalFunc()
  } catch (error) {
    console.error("Nickname change error:", error)
    dom.showToast(error.message || "닉네임 변경에 실패했습니다", "error")
  } finally {
    dom.hideSpinner(spinner)
  }
})

// Password change modal functionality
changePasswordLink.addEventListener("click", () => {
  passwordModal.style.display = "flex"
  document.body.style.overflow = "hidden"
})

closePasswordModal.addEventListener("click", closePasswordModalFunc)
cancelPasswordBtn.addEventListener("click", closePasswordModalFunc)

// Close modal when clicking overlay
passwordModal.addEventListener("click", (e) => {
  if (e.target === passwordModal) {
    closePasswordModalFunc()
  }
})

function closePasswordModalFunc() {
  passwordModal.style.display = "none"
  document.body.style.overflow = "auto"
  passwordForm.reset()
  // Clear errors
  dom.qs("#current-password-error").textContent = ""
  dom.qs("#new-password-error").textContent = ""
  dom.qs("#new-password-confirm-error").textContent = ""
}

// Handle password form submission
passwordForm.addEventListener("submit", async (e) => {
  e.preventDefault()

  const currentPassword = dom.qs("#current-password").value
  const newPassword = dom.qs("#new-password").value
  const newPasswordConfirm = dom.qs("#new-password-confirm").value

  // Clear errors
  dom.qs("#current-password-error").textContent = ""
  dom.qs("#new-password-error").textContent = ""
  dom.qs("#new-password-confirm-error").textContent = ""

  // Validation
  if (!currentPassword) {
    dom.qs("#current-password-error").textContent = "현재 비밀번호를 입력해주세요"
    return
  }

  if (!newPassword) {
    dom.qs("#new-password-error").textContent = "새 비밀번호를 입력해주세요"
    return
  }

  if (newPassword.length < 8) {
    dom.qs("#new-password-error").textContent = "비밀번호는 8자 이상이어야 합니다"
    return
  }

  if (newPassword !== newPasswordConfirm) {
    dom.qs("#new-password-confirm-error").textContent = "비밀번호가 일치하지 않습니다"
    return
  }

  const spinner = dom.showSpinner()

  try {
    await api.updatePassword(currentPassword, newPassword)

    dom.showToast("비밀번호가 변경되었습니다")

    // Close modal and reset form
    closePasswordModalFunc()
  } catch (error) {
    console.error("Password change error:", error)
    dom.showToast(error.message || "비밀번호 변경에 실패했습니다", "error")
  } finally {
    dom.hideSpinner(spinner)
  }
})

// Account deletion functionality
deleteAccountLink.addEventListener("click", () => {
  deleteModal.style.display = "flex"
  document.body.style.overflow = "hidden"
})

closeDeleteModal.addEventListener("click", closeDeleteModalFunc)
cancelDeleteBtn.addEventListener("click", closeDeleteModalFunc)

// Close delete modal when clicking overlay
deleteModal.addEventListener("click", (e) => {
  if (e.target === deleteModal) {
    closeDeleteModalFunc()
  }
})

function closeDeleteModalFunc() {
  deleteModal.style.display = "none"
  document.body.style.overflow = "auto"
}

// Handle account deletion
confirmDeleteBtn.addEventListener("click", async () => {
  const spinner = dom.showSpinner()

  try {
    await api.deleteAccount()
    
    dom.showToast("계정이 삭제되었습니다", "success")
    
    // Clear storage and redirect to login
    storage.clearAll()
    setTimeout(() => {
      window.location.href = "/login"
    }, 1000)
  } catch (error) {
    console.error("Account deletion error:", error)
    dom.showToast(error.message || "계정 삭제에 실패했습니다", "error")
  } finally {
    dom.hideSpinner(spinner)
    closeDeleteModalFunc()
  }
})

// Logout handler
logoutBtn?.addEventListener("click", () => {
  const modal = dom.qs("#logout-modal")
  if (modal) {
    modal.style.display = "flex"
  }
})

// Logout modal handlers
const closeLogoutModal = () => {
  const modal = dom.qs("#logout-modal")
  if (modal) {
    modal.style.display = "none"
  }
}

dom.qs("#close-logout-modal")?.addEventListener("click", closeLogoutModal)
dom.qs("#cancel-logout-btn")?.addEventListener("click", closeLogoutModal)

dom.qs("#confirm-logout-btn")?.addEventListener("click", async () => {
  closeLogoutModal()
  
  const spinner = dom.showSpinner()

  try {
    await api.logout()
    dom.showToast("로그아웃 되었습니다")
    
    // Clear storage and redirect to login
    storage.clearAll()
    setTimeout(() => {
      window.location.href = "/login"
    }, 1000)
  } catch (error) {
    console.error("Logout error:", error)
    dom.showToast(error.message || "로그아웃에 실패했습니다", "error")
  } finally {
    dom.hideSpinner(spinner)
  }
})

// Close modal on overlay click
dom.qs("#logout-modal")?.addEventListener("click", (e) => {
  if (e.target.id === "logout-modal") {
    closeLogoutModal()
  }
})

// Initialize - only load if elements exist
if (profileImage && profileName) {
  loadProfile()
}
