import { api } from "/js/api.js"
import { dom } from "/js/dom.js"

async function loadPopularPosts() {
  const container = dom.qs("#popular-posts")

  try {
    const response = await api.getPosts({ strategy: "POPULAR" })
    const posts = response.items.slice(0, 3)

    if (!posts || posts.length === 0) {
      container.innerHTML = '<div class="empty-state">아직 게시글이 없습니다</div>'
      return
    }

    container.innerHTML = ""
    posts.forEach((post) => {
      container.appendChild(createPostCard(post))
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
    const posts = response.items.slice(0, 3)

    if (!posts || posts.length === 0) {
      container.innerHTML = '<div class="empty-state">아직 게시글이 없습니다</div>'
      return
    }

    container.innerHTML = ""
    posts.forEach((post) => {
      container.appendChild(createPostCard(post))
    })
  } catch (error) {
    console.error("Failed to load recent posts:", error)
    container.innerHTML = '<div class="empty-state">게시글을 불러오는데 실패했습니다</div>'
  }
}

function createPostCard(post) {
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

  // comments (fallback 0 when not provided)
  const commentWrap = dom.create("span", { className: "post-card-meta-item" })
  commentWrap.appendChild(dom.create("img", {
    src: "/comment.png",
    alt: "comments",
    className: "post-card-icon",
  }))
  commentWrap.appendChild(dom.create("span", {}, [String(post.commentCount ?? 0)]))
  metaRow.appendChild(commentWrap)

  mainContent.appendChild(metaRow)
  
  cardContent.appendChild(mainContent)
  
  // Thumbnail (1:1 aspect ratio on the right)
  if (post.imageUrl) {
    const thumbnail = dom.create("img", {
      src: post.imageUrl,
      alt: post.title,
      className: "post-card-thumbnail",
    })
    cardContent.appendChild(thumbnail)
  } else {
    const placeholder = dom.create("div", { className: "post-card-thumbnail-placeholder" }, ["📷"])
    cardContent.appendChild(placeholder)
  }
  
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
