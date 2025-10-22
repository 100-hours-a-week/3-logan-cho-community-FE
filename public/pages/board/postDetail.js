import { api } from "/js/api.js"
import { dom } from "/js/dom.js"
import { initComments } from "/pages/board/comment.js"

let currentPost = null

async function loadPostDetail() {
  const postId = new URLSearchParams(window.location.search).get("postId")

  if (!postId) {
    showError("잘못된 접근입니다", "게시글 ID가 없습니다")
    return
  }

  const spinner = dom.showSpinner()

  try {
    currentPost = await api.getPostDetail(postId)

    renderPost(currentPost)
    
    // Initialize comments
    initComments(postId, currentPost.comments || [])
  } catch (error) {
    console.error("Failed to load post:", error)
    showError("게시글을 불러오는데 실패했습니다", "다시 시도해주세요")
  } finally {
    dom.hideSpinner(spinner)
  }
}

function renderPost(post) {
  // Title
  dom.qs("#post-title").textContent = post.title

  // Author info
  if (post.author) {
    dom.qs("#author-avatar").src = post.author.profileImageUrl || "/user-profile-illustration.png"
    dom.qs("#author-name").textContent = post.author.name
  }

  // Date and edit status
  dom.qs("#post-date").textContent = formatDate(post.createdAt)
  if (post.isUpdated) {
    dom.qs("#edit-badge").style.display = "inline-block"
  }

  // Images
  const imagesContainer = dom.qs("#post-images")
  const placeholder = dom.qs("#image-placeholder")
  imagesContainer.innerHTML = ""
  
  if (post.imageUrls && post.imageUrls.length > 0) {
    post.imageUrls.forEach((url) => {
      const img = dom.create("img", {
        src: url,
        alt: "Post image",
        className: "post-image",
      })
      imagesContainer.appendChild(img)
    })
  } else {
    placeholder.style.display = "flex"
    imagesContainer.appendChild(placeholder)
  }

  // Content
  dom.qs("#post-content").textContent = post.content

  // Stats
  dom.qs("#like-count").textContent = post.likes || 0
  dom.qs("#comment-count").textContent = post.comments?.length || 0
  dom.qs("#view-count").textContent = post.views || 0
}

function formatDate(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const minutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(diffMs / 3600000)
  const days = Math.floor(diffMs / 86400000)

  if (minutes < 60) return `${Math.max(minutes, 1)}분 전`
  if (hours < 24) return `${hours}시간 전`
  if (days <= 10) return `${days}일 전`
  return date.toLocaleDateString("ko-KR")
}

function showError(title, message) {
  const container = dom.qs(".container")
  container.innerHTML = `
    <div class="error-state">
      <h2>${title}</h2>
      <p>${message}</p>
      <button class="btn" onclick="window.history.back()">돌아가기</button>
    </div>
  `
}

// Initialize
loadPostDetail()
