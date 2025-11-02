import { storage } from "./storage.js"
import { dom } from "./dom.js"
import { api } from "./api.js"
import { config } from "./config.js"

/**
 * Common functionality shared across all pages
 * - Injects header and footer (except on auth pages)
 * - Handles auth state in navigation
 * - Sets active nav links
 */

function isAuthPage() {
  const path = window.location.pathname
  return path === "/login" || path === "/signup" || path === "/recover"
}

// Inject header
function injectHeader() {
  if (isAuthPage()) {
    return
  }

  const navContainer = dom.create("nav", { className: "header-nav", style: "position: relative;" })
  
  const mypageBtn = dom.create("button", { 
    className: "nav-icon", 
    id: "mypage-icon-btn",
    "aria-label": "마이페이지"
  }, [
    dom.create("img", { 
      src: "/mypage-icon.png", 
      alt: "마이페이지", 
      className: "nav-icon-img" 
    })
  ])
  
  navContainer.appendChild(mypageBtn)

  const header = dom.create("header", { className: "header" }, [
    dom.create("div", { className: "header-content container" }, [
      dom.create("a", { href: "/", className: "header-logo" }, ["Millions"]),
      navContainer,
    ]),
  ])

  document.body.insertBefore(header, document.body.firstChild)
  
  // Inject mypage dropdown if logged in
  if (storage.hasToken()) {
    injectMypageDropdown(navContainer)
  }
}

// Inject footer
function injectFooter() {
  if (isAuthPage()) {
    return
  }

  const footer = dom.create("footer", { className: "footer" }, [
    dom.create("div", { className: "container" }, [`© ${new Date().getFullYear()} Millions. All rights reserved.`]),
  ])

  document.body.appendChild(footer)
}


// Inject MyPage Modals
function injectMypageModals() {
  // Nickname Modal
  const nicknameModal = dom.create("div", { className: "modal-overlay", id: "nickname-modal", style: "display: none;" }, [
    dom.create("div", { className: "modal" }, [
      dom.create("div", { className: "modal-header" }, [
        dom.create("h3", { className: "modal-title" }, ["닉네임 변경"]),
        dom.create("button", { className: "modal-close", id: "close-nickname-modal" }, ["×"])
      ]),
      dom.create("div", { className: "modal-body" }, [
        dom.create("form", { id: "nickname-form" }, [
          dom.create("div", { className: "form-group" }, [
            dom.create("label", { for: "nickname-input", className: "form-label" }, ["새 닉네임"]),
            dom.create("input", { 
              type: "text", 
              id: "nickname-input", 
              className: "form-input", 
              placeholder: "새 닉네임을 입력하세요",
              required: true,
              maxlength: "12"
            }),
            dom.create("div", { className: "form-feedback" }, [
              dom.create("div", { className: "form-error", id: "nickname-error" }),
              dom.create("div", { className: "form-helper", id: "nickname-helper" }, ["2~12자"])
            ])
          ]),
          dom.create("div", { className: "form-actions" }, [
            dom.create("button", { type: "button", className: "btn btn-secondary", id: "cancel-nickname-btn" }, ["취소"]),
            dom.create("button", { type: "submit", className: "btn btn-primary" }, ["변경"])
          ])
        ])
      ])
    ])
  ])
  
  // Password Modal
  const passwordModal = dom.create("div", { className: "modal-overlay", id: "password-modal", style: "display: none;" }, [
    dom.create("div", { className: "modal" }, [
      dom.create("div", { className: "modal-header" }, [
        dom.create("h3", { className: "modal-title" }, ["비밀번호 변경"]),
        dom.create("button", { className: "modal-close", id: "close-password-modal" }, ["×"])
      ]),
      dom.create("div", { className: "modal-body" }, [
        dom.create("form", { id: "password-form" }, [
          dom.create("div", { className: "form-group" }, [
            dom.create("label", { for: "current-password", className: "form-label" }, ["현재 비밀번호"]),
            dom.create("input", { 
              type: "password", 
              id: "current-password", 
              className: "form-input", 
              placeholder: "현재 비밀번호를 입력하세요",
              required: true
            }),
            dom.create("div", { className: "form-error", id: "current-password-error" })
          ]),
          dom.create("div", { className: "form-group" }, [
            dom.create("label", { for: "new-password", className: "form-label" }, ["새 비밀번호"]),
            dom.create("input", { 
              type: "password", 
              id: "new-password", 
              className: "form-input", 
              placeholder: "새 비밀번호를 입력하세요",
              required: true
            }),
            dom.create("div", { className: "form-helper" }, ["8자 이상, 영문/숫자/특수문자 포함"]),
            dom.create("div", { className: "form-error", id: "new-password-error" })
          ]),
          dom.create("div", { className: "form-group" }, [
            dom.create("label", { for: "new-password-confirm", className: "form-label" }, ["새 비밀번호 확인"]),
            dom.create("input", { 
              type: "password", 
              id: "new-password-confirm", 
              className: "form-input", 
              placeholder: "새 비밀번호를 다시 입력하세요",
              required: true
            }),
            dom.create("div", { className: "form-error", id: "new-password-confirm-error" })
          ]),
          dom.create("div", { className: "form-actions" }, [
            dom.create("button", { type: "button", className: "btn btn-secondary", id: "cancel-password-btn" }, ["취소"]),
            dom.create("button", { type: "submit", className: "btn btn-primary" }, ["변경"])
          ])
        ])
      ])
    ])
  ])
  
  // Delete Account Modal
  const deleteModal = dom.create("div", { className: "modal-overlay", id: "delete-modal", style: "display: none;" }, [
    dom.create("div", { className: "modal" }, [
      dom.create("div", { className: "modal-header" }, [
        dom.create("h3", { className: "modal-title" }, ["회원 탈퇴"]),
        dom.create("button", { className: "modal-close", id: "close-delete-modal" }, ["×"])
      ]),
      dom.create("div", { className: "modal-body" }, [
        dom.create("div", { className: "delete-warning" }, [
          dom.create("p", { className: "warning-text" }, ["정말로 삭제하시겠습니까?"]),
          dom.create("p", { className: "warning-subtext" }, ["삭제 후 90일 이내엔 계정을 복구할 수 있습니다."])
        ]),
        dom.create("div", { className: "form-actions" }, [
          dom.create("button", { type: "button", className: "btn btn-secondary", id: "cancel-delete-btn" }, ["취소"]),
          dom.create("button", { type: "button", className: "btn btn-danger", id: "confirm-delete-btn" }, ["삭제"])
        ])
      ])
    ])
  ])
  
  // Logout Modal
  const logoutModal = dom.create("div", { className: "modal-overlay", id: "logout-modal", style: "display: none;" }, [
    dom.create("div", { className: "modal" }, [
      dom.create("div", { className: "modal-header" }, [
        dom.create("h3", { className: "modal-title" }, ["로그아웃"]),
        dom.create("button", { className: "modal-close", id: "close-logout-modal" }, ["×"])
      ]),
      dom.create("div", { className: "modal-body" }, [
        dom.create("div", { className: "delete-warning" }, [
          dom.create("p", { className: "warning-text" }, ["로그아웃 하시겠습니까?"])
        ]),
        dom.create("div", { className: "form-actions" }, [
          dom.create("button", { type: "button", className: "btn btn-secondary", id: "cancel-logout-btn" }, ["취소"]),
          dom.create("button", { type: "button", className: "btn btn-primary", id: "confirm-logout-btn" }, ["로그아웃"])
        ])
      ])
    ])
  ])
  
  // Delete Post Modal
  const deletePostModal = dom.create("div", { className: "modal-overlay", id: "delete-post-modal", style: "display: none;" }, [
    dom.create("div", { className: "modal" }, [
      dom.create("div", { className: "modal-header" }, [
        dom.create("h3", { className: "modal-title" }, ["게시물 삭제"]),
        dom.create("button", { className: "modal-close", id: "close-delete-post-modal" }, ["×"])
      ]),
      dom.create("div", { className: "modal-body" }, [
        dom.create("div", { className: "delete-warning" }, [
          dom.create("p", { className: "warning-text" }, ["정말로 이 게시물을 삭제하시겠습니까?"])
        ]),
        dom.create("div", { className: "form-actions" }, [
          dom.create("button", { type: "button", className: "btn btn-secondary", id: "cancel-delete-post-btn" }, ["취소"]),
          dom.create("button", { type: "button", className: "btn btn-danger", id: "confirm-delete-post-btn" }, ["삭제"])
        ])
      ])
    ])
  ])
  
  // Delete Comment Modal
  const deleteCommentModal = dom.create("div", { className: "modal-overlay", id: "delete-comment-modal", style: "display: none;" }, [
    dom.create("div", { className: "modal" }, [
      dom.create("div", { className: "modal-header" }, [
        dom.create("h3", { className: "modal-title" }, ["댓글 삭제"]),
        dom.create("button", { className: "modal-close", id: "close-delete-comment-modal" }, ["×"])
      ]),
      dom.create("div", { className: "modal-body" }, [
        dom.create("div", { className: "delete-warning" }, [
          dom.create("p", { className: "warning-text" }, ["정말로 이 댓글을 삭제하시겠습니까?"])
        ]),
        dom.create("div", { className: "form-actions" }, [
          dom.create("button", { type: "button", className: "btn btn-secondary", id: "cancel-delete-comment-btn" }, ["취소"]),
          dom.create("button", { type: "button", className: "btn btn-danger", id: "confirm-delete-comment-btn" }, ["삭제"])
        ])
      ])
    ])
  ])
  
  document.body.appendChild(nicknameModal)
  document.body.appendChild(passwordModal)
  document.body.appendChild(deleteModal)
  document.body.appendChild(logoutModal)
  document.body.appendChild(deletePostModal)
  document.body.appendChild(deleteCommentModal)
}

// Inject MyPage Dropdown
function injectMypageDropdown(navContainer) {
  const dropdown = dom.create("div", { className: "mypage-dropdown", id: "mypage-dropdown" }, [
    dom.create("div", { className: "mypage-dropdown-content" }, [
      // Profile Section
      dom.create("div", { className: "mypage-profile" }, [
        dom.create("div", { className: "mypage-profile-image-container profile-image-container", id: "profile-image-container" }, [
          dom.create("img", { 
            id: "profile-image", 
            src: "/user-profile-illustration.png", 
            alt: "프로필 이미지", 
            className: "mypage-profile-image" 
          }),
          dom.create("div", { className: "mypage-image-hover-text" }, ["이미지 변경"]),
          dom.create("input", { 
            type: "file", 
            id: "profile-image-input", 
            accept: "image/*", 
            hidden: true 
          })
        ]),
        dom.create("div", { className: "mypage-profile-info" }, [
          dom.create("h3", { className: "mypage-profile-name", id: "profile-name" }, ["사용자 이름"]),
          dom.create("p", { className: "mypage-profile-email", id: "profile-email" }, ["user@example.com"])
        ])
      ]),
      
      // Action Links
      dom.create("div", { className: "mypage-actions" }, [
        dom.create("span", { className: "mypage-action-link", id: "change-nickname-link" }, ["닉네임 변경"]),
        dom.create("span", { className: "mypage-action-link", id: "change-password-link" }, ["비밀번호 변경"]),
        dom.create("span", { className: "mypage-action-link mypage-delete-link", id: "delete-account-link" }, ["회원 탈퇴하기"])
      ]),
      
      // Links
      dom.create("div", { className: "mypage-links" }, [
        dom.create("div", { className: "mypage-links-left" }, [
          dom.create("a", { href: `${config.API_BASE_URL}/policy/privacy`, className: "mypage-link", target: "_blank", rel: "noopener noreferrer" }, ["개인정보 처리방침"]),
          dom.create("a", { href: `${config.API_BASE_URL}/policy/terms`, className: "mypage-link", target: "_blank", rel: "noopener noreferrer" }, ["이용약관"])
        ]),
        dom.create("button", { className: "mypage-logout-btn", id: "logout-btn" }, ["로그아웃"])
      ])
    ])
  ])
  
  navContainer.appendChild(dropdown)
  
  // Add modals to body (needed by mypage.js)
  injectMypageModals()
  
  // Load CSS
  const link = document.createElement("link")
  link.rel = "stylesheet"
  link.href = "/components/mypage-dropdown.css"
  document.head.appendChild(link)
  
  // Load mypage CSS for modals
  const mypageCss = document.createElement("link")
  mypageCss.rel = "stylesheet"
  mypageCss.href = "/pages/mypage/mypage.css"
  document.head.appendChild(mypageCss)
  
  // Load mypage.js
  const script = document.createElement("script")
  script.type = "module"
  script.src = "/pages/mypage/mypage.js"
  document.head.appendChild(script)
  
  // Toggle dropdown on icon click
  const mypageBtn = dom.qs("#mypage-icon-btn")
  mypageBtn?.addEventListener("click", (e) => {
    e.stopPropagation()
    dropdown.classList.toggle("active")
  })
  
  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target) && !mypageBtn?.contains(e.target)) {
      dropdown.classList.remove("active")
    }
  })
}

// Initialize common elements
export function initCommon() {
  injectHeader()
  injectFooter()
}

// Auto-initialize on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCommon)
} else {
  initCommon()
}
