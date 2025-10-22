import { storage } from "./storage.js"
import { dom } from "./dom.js"
import { api } from "./api.js"

/**
 * Common functionality shared across all pages
 * - Injects header and footer (except on auth pages)
 * - Handles auth state in navigation
 * - Sets active nav links
 */

function isAuthPage() {
  const path = window.location.pathname
  return path === "/login" || path === "/signup"
}

// Inject header
function injectHeader() {
  if (isAuthPage()) {
    return
  }

  const header = dom.create("header", { className: "header" }, [
    dom.create("div", { className: "header-content container" }, [
      dom.create("a", { href: "/", className: "header-logo" }, ["Kaboocam"]),
      dom.create("nav", { className: "header-nav", id: "main-nav" }),
    ]),
  ])

  document.body.insertBefore(header, document.body.firstChild)
  updateNav()
}

// Inject footer
function injectFooter() {
  if (isAuthPage()) {
    return
  }

  const footer = dom.create("footer", { className: "footer" }, [
    dom.create("div", { className: "container" }, [`© ${new Date().getFullYear()} Kaboocam. All rights reserved.`]),
  ])

  document.body.appendChild(footer)
}

// Update navigation based on auth state
function updateNav() {
  const nav = dom.qs("#main-nav")
  if (!nav) return

  nav.innerHTML = ""

  const isAuthenticated = storage.hasToken()
  const currentPath = window.location.pathname

  // Common links
  const links = [
    { href: "/", label: "Home", path: "/" },
    { href: "/board", label: "Board", path: "/board" },
  ]

  if (isAuthenticated) {
    links.push({ href: "/mypage", label: "MyPage", path: "/mypage" })
  }

  // Create nav links
  links.forEach((link) => {
    const navLink = dom.create(
      "a",
      {
        href: link.href,
        className: `nav-link ${currentPath === link.path ? "active" : ""}`,
      },
      [link.label],
    )
    nav.appendChild(navLink)
  })

  if (isAuthenticated) {
    const logoutBtn = dom.create(
      "button",
      {
        className: "nav-link",
        onClick: handleLogout,
      },
      ["Logout"],
    )
    nav.appendChild(logoutBtn)
  }
}

// Handle logout
async function handleLogout() {
  try {
    await api.delete("/api/auth")
  } catch (error) {
    console.error("Logout error:", error)
  } finally {
    storage.clearAll()
    dom.showToast("로그아웃되었습니다")
    setTimeout(() => {
      window.location.href = "/login"
    }, 500)
  }
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
