import { api } from "/js/api.js"
import { dom } from "/js/dom.js"
import { cdn } from "/js/cdn.js"

// Debug: Log all link clicks
document.addEventListener("click", (e) => {
  if (e.target.tagName === "A" || e.target.closest("a")) {
    const link = e.target.tagName === "A" ? e.target : e.target.closest("a")
    console.log("🔗 [Home] Link clicked:", link.href)
    console.log("🔗 [Home] Link text:", link.textContent)
  }
})

async function loadPopularPosts() {
  const container = dom.qs("#popular-posts")

  try {
    const response = await api.getPosts({ strategy: "POPULAR" })
    const cdnBaseUrl = response.cdnBaseUrl || ""
    const posts = response.posts?.items?.slice(0, 3) || []

    if (!posts || posts.length === 0) {
      container.innerHTML = '<div class="empty-state">아직 게시글이 없습니다</div>'
      return
    }

    container.innerHTML = ""
    posts.forEach((post) => {
      container.appendChild(createPostCard(post, cdnBaseUrl))
    })
  } catch (error) {
    console.error("Failed to load popular posts:", error)
    container.innerHTML = '<div class="empty-state">게시글을 불러오는데 실패했습니다</div>'
  }
}

async function loadRecentPosts() {
  const container = dom.qs("#recent-posts")

  try {
    const response = await api.getPosts({ strategy: "RECENT" })
    const cdnBaseUrl = response.cdnBaseUrl || ""
    const posts = response.posts?.items?.slice(0, 3) || []

    if (!posts || posts.length === 0) {
      container.innerHTML = '<div class="empty-state">아직 게시글이 없습니다</div>'
      return
    }

    container.innerHTML = ""
    posts.forEach((post) => {
      container.appendChild(createPostCard(post, cdnBaseUrl))
    })
  } catch (error) {
    console.error("Failed to load recent posts:", error)
    container.innerHTML = '<div class="empty-state">게시글을 불러오는데 실패했습니다</div>'
  }
}

function createPostCard(post, cdnBaseUrl = "") {
  const card = dom.create("article", { className: "post-card" })
  
  const cardContent = dom.create("div", { className: "post-card-content" })
  
  // Main content area
  const mainContent = dom.create("div", { className: "post-card-main" })
  
  // Title
  const title = dom.create("h3", { className: "post-card-title" }, [post.title])
  mainContent.appendChild(title)
  
  // Content summary (first 100 characters)
  const contentText = post.content ? post.content.substring(0, 100) + (post.content.length > 100 ? "..." : "") : ""
  const content = dom.create("p", { className: "post-card-content-text" }, [contentText])
  mainContent.appendChild(content)
  
  // Meta row (time, views, likes, comments)
  const metaRow = dom.create("div", { className: "post-card-meta-row" })

  // time
  metaRow.appendChild(dom.create("span", { className: "post-card-meta-item" }, [
    formatRelativeTime(post.createdAt),
  ]))

  // views
  metaRow.appendChild(dom.create("span", { className: "post-card-meta-item" }, [
    formatViews(post.views),
  ]))

  // likes
  const likeWrap = dom.create("span", { className: "post-card-meta-item" })
  const likeIcon = dom.create("img", {
    src: "/like.png",
    alt: "like",
    className: `post-card-icon${post.like?.amILike ? " post-card-like--active" : ""}`,
  })
  likeWrap.appendChild(likeIcon)
  likeWrap.appendChild(dom.create("span", {}, [String(post.like?.count ?? 0)]))
  metaRow.appendChild(likeWrap)

  mainContent.appendChild(metaRow)
  
  cardContent.appendChild(mainContent)
  
  // Thumbnail (1:1 aspect ratio on the right)
  if (post.imageObjectKeys && post.imageObjectKeys.length > 0 && cdnBaseUrl) {
    const thumbnailUrl = cdn.getUrl(cdnBaseUrl, post.imageObjectKeys[0])
    const thumbnail = dom.create("img", {
      src: thumbnailUrl,
      alt: post.title,
      className: "post-card-thumbnail",
    })
    
    // Handle image load error with signed cookie retry
    thumbnail.addEventListener("error", async () => {
      try {
        const blob = await cdn.fetchImage(cdnBaseUrl, post.imageObjectKeys[0])
        thumbnail.src = URL.createObjectURL(blob)
      } catch (error) {
        console.error("Failed to load thumbnail:", error)
        // Hide thumbnail on error
        thumbnail.style.display = "none"
      }
    }, { once: true })
    
    cardContent.appendChild(thumbnail)
  } else if (post.imageUrl) {
    // Fallback to old imageUrl if present
    const thumbnail = dom.create("img", {
      src: post.imageUrl,
      alt: post.title,
      className: "post-card-thumbnail",
    })
    cardContent.appendChild(thumbnail)
  }
  // No placeholder - just don't show anything if no image
  
  card.appendChild(cardContent)
  
  // Click handler
  card.addEventListener("click", () => {
    window.location.href = `/pages/board/postDetail.html?postId=${post.postId}`
  })

  return card
}

// Helpers
function formatRelativeTime(isoString) {
  const date = new Date(isoString)
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

function formatViews(views) {
  return `조회${Number(views || 0)}회`
}

// Initialize
loadPopularPosts()
loadRecentPosts()
