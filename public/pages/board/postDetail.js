import { api } from "/js/api.js"
import { dom } from "/js/dom.js"
import { storage } from "/js/storage.js"
import { cdn } from "/js/cdn.js"

let currentPost = null
let currentPostId = null

async function loadPostDetail() {
  currentPostId = new URLSearchParams(window.location.search).get("postId")

  if (!currentPostId) {
    showError("잘못된 접근입니다", "게시글 ID가 없습니다")
    return
  }

  const spinner = dom.showSpinner()

  try {
    currentPost = await api.getPostDetail(currentPostId)

    renderPost(currentPost)
    
    // Load comments using API
    await loadComments()
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

  // Show edit/delete buttons if this is user's post
  if (post.isMine) {
    dom.qs("#post-actions").style.display = "flex"
  }

  // Author info
  if (post.authorProfile) {
    const cdnBaseUrl = post.cdnBaseUrl || ""
    const avatarElement = dom.qs("#author-avatar")
    
    if (post.authorProfile.profileImageObjectKey) {
      const avatarUrl = cdn.getUrl(cdnBaseUrl, post.authorProfile.profileImageObjectKey)
      avatarElement.src = avatarUrl
      
      // Handle image load error with signed cookie retry
      avatarElement.addEventListener("error", async () => {
        try {
          const blob = await cdn.fetchImage(cdnBaseUrl, post.authorProfile.profileImageObjectKey)
          avatarElement.src = URL.createObjectURL(blob)
        } catch (error) {
          console.error("Failed to load author avatar:", error)
          avatarElement.src = "/user-profile-illustration.png"
        }
      })
    } else {
      avatarElement.src = "/user-profile-illustration.png"
    }
    
    dom.qs("#author-name").textContent = post.authorProfile.name
  }

  // Date and edit status
  dom.qs("#post-date").textContent = formatDate(post.createdAt)
  if (post.isUpdated) {
    dom.qs("#edit-badge").style.display = "inline-block"
  }

  // Images
  const imagesContainer = dom.qs("#post-images")
  imagesContainer.innerHTML = ""
  
  if (post.imageObjectKeys && post.imageObjectKeys.length > 0) {
    const cdnBaseUrl = post.cdnBaseUrl || ""
    imagesContainer.style.display = "block"
    
    post.imageObjectKeys.forEach((key) => {
      const imageUrl = cdn.getUrl(cdnBaseUrl, key)
      const img = dom.create("img", {
        src: imageUrl,
        alt: "Post image",
        className: "post-image",
      })
      
      // Handle image load error with signed cookie retry
      img.addEventListener("error", async () => {
        try {
          const blob = await cdn.fetchImage(cdnBaseUrl, key)
          img.src = URL.createObjectURL(blob)
        } catch (error) {
          console.error("Failed to load post image:", error)
          img.style.display = "none"
        }
      }, { once: true })
      
      imagesContainer.appendChild(img)
    })
  } else {
    // Hide image container if no images
    imagesContainer.style.display = "none"
  }

  // Content
  dom.qs("#post-content").textContent = post.content

  // Stats
  updateLikeUI(post.amILiking, post.likes)
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

function updateLikeUI(amILiking, count) {
  const likeIcon = dom.qs("#like-icon")
  const likeCount = dom.qs("#like-count")
  
  if (amILiking) {
    likeIcon.classList.add("liked")
  } else {
    likeIcon.classList.remove("liked")
  }
  
  likeCount.textContent = count || 0
}

// Like button handler
dom.qs("#like-btn")?.addEventListener("click", async () => {
  if (!storage.hasToken()) {
    dom.showToast("로그인이 필요합니다", "error")
    return
  }

  try {
    if (currentPost.amILiking) {
      await api.unlikePost(currentPostId)
      currentPost.amILiking = false
      currentPost.likes = Math.max(0, currentPost.likes - 1)
    } else {
      await api.likePost(currentPostId)
      currentPost.amILiking = true
      currentPost.likes = (currentPost.likes || 0) + 1
    }
    
    updateLikeUI(currentPost.amILiking, currentPost.likes)
  } catch (error) {
    console.error("Like error:", error)
    dom.showToast("좋아요 처리에 실패했습니다", "error")
  }
})

// Edit post button
dom.qs("#edit-post-btn")?.addEventListener("click", () => {
  // TODO: Implement edit modal/page
  dom.showToast("게시물 수정 기능은 준비중입니다")
})

// Delete post button
dom.qs("#delete-post-btn")?.addEventListener("click", async () => {
  if (!confirm("정말로 이 게시물을 삭제하시겠습니까?")) {
    return
  }

  const spinner = dom.showSpinner()

  try {
    await api.deletePost(currentPostId)
    dom.showToast("게시물이 삭제되었습니다")
    setTimeout(() => {
      window.location.href = "/pages/board/board.html"
    }, 1000)
  } catch (error) {
    console.error("Delete error:", error)
    dom.showToast("게시물 삭제에 실패했습니다", "error")
  } finally {
    dom.hideSpinner(spinner)
  }
})

// Load and render comments
async function loadComments() {
  try {
    const response = await api.getCommentList(currentPostId)
    const comments = response.comments?.items || []
    const cdnBaseUrl = response.cdnBaseUrl || ""
    
    dom.qs("#comments-count").textContent = comments.length
    dom.qs("#comment-count").textContent = comments.length
    
    renderComments(comments, cdnBaseUrl)
  } catch (error) {
    console.error("Failed to load comments:", error)
  }
}

function renderComments(comments, cdnBaseUrl) {
  const commentsList = dom.qs("#comments-list")
  commentsList.innerHTML = ""

  if (comments.length === 0) {
    commentsList.innerHTML = '<div class="comments-empty">첫 댓글을 작성해보세요!</div>'
    return
  }

  comments.forEach((comment) => {
    commentsList.appendChild(createCommentItem(comment, cdnBaseUrl))
  })
}

function createCommentItem(comment, cdnBaseUrl) {
  const item = dom.create("div", { className: "comment-item" })

  const header = dom.create("div", { className: "comment-header" })

  const authorInfo = dom.create("div", { className: "comment-author-info" })
  
  const avatar = dom.create("img", {
    src: comment.author.profileImageObjectKey 
      ? cdn.getUrl(cdnBaseUrl, comment.author.profileImageObjectKey)
      : "/user-profile-illustration.png",
    alt: comment.author.name,
    className: "comment-avatar",
  })
  
  // Handle avatar load error with signed cookie retry
  if (comment.author.profileImageObjectKey) {
    avatar.addEventListener("error", async () => {
      try {
        const blob = await cdn.fetchImage(cdnBaseUrl, comment.author.profileImageObjectKey)
        avatar.src = URL.createObjectURL(blob)
      } catch (error) {
        console.error("Failed to load comment avatar:", error)
        avatar.src = "/user-profile-illustration.png"
      }
    })
  }
  
  const authorDetails = dom.create("div", { className: "comment-author-details" })
  const authorName = dom.create("span", { className: "comment-author-name" }, [comment.author.name])
  const commentDate = dom.create("span", { className: "comment-date" }, [formatDate(comment.createdAt)])
  
  if (comment.isUpdated) {
    commentDate.textContent += " (수정됨)"
  }
  
  authorDetails.appendChild(authorName)
  authorDetails.appendChild(commentDate)
  authorInfo.appendChild(avatar)
  authorInfo.appendChild(authorDetails)
  header.appendChild(authorInfo)

  // Show edit/delete buttons if this is user's comment
  if (comment.isMine) {
    const actions = dom.create("div", { className: "comment-actions" })
    
    const editBtn = dom.create("button", {
      className: "btn-comment-action edit",
    }, ["수정"])
    editBtn.addEventListener("click", () => editComment(comment.commentId, comment.content))
    
    const deleteBtn = dom.create("button", {
      className: "btn-comment-action delete",
    }, ["삭제"])
    deleteBtn.addEventListener("click", () => deleteComment(comment.commentId))
    
    actions.appendChild(editBtn)
    actions.appendChild(deleteBtn)
    header.appendChild(actions)
  }

  const content = dom.create("p", { className: "comment-content" }, [comment.content])

  item.appendChild(header)
  item.appendChild(content)

  return item
}

// Comment form submission
dom.qs("#comment-form")?.addEventListener("submit", async (e) => {
  e.preventDefault()

  if (!storage.hasToken()) {
    dom.showToast("로그인이 필요합니다", "error")
    return
  }

  const commentInput = dom.qs("#comment-input")
  const content = commentInput.value.trim()

  if (!content) {
    dom.showToast("댓글 내용을 입력해주세요", "error")
    return
  }

  const spinner = dom.showSpinner()

  try {
    await api.createComment(currentPostId, content)
    commentInput.value = ""
    dom.qs("#comment-char-count").textContent = "0/500"
    dom.showToast("댓글이 작성되었습니다")
    
    // Reload comments
    await loadComments()
  } catch (error) {
    console.error("Comment creation error:", error)
    dom.showToast("댓글 작성에 실패했습니다", "error")
  } finally {
    dom.hideSpinner(spinner)
  }
})

// Comment input - character limit and auto-expand
const commentInput = dom.qs("#comment-input")

commentInput?.addEventListener("input", (e) => {
  const length = e.target.value.length
  if (length > 500) {
    e.target.value = e.target.value.substring(0, 500)
    dom.showToast("댓글은 최대 500자까지 작성할 수 있습니다", "error")
  }
})

// Keep expanded state when user is typing
commentInput?.addEventListener("blur", (e) => {
  if (!e.target.value.trim()) {
    e.target.classList.remove("expanded")
  }
})

commentInput?.addEventListener("focus", (e) => {
  e.target.classList.add("expanded")
})

// Edit comment
async function editComment(commentId, currentContent) {
  const newContent = prompt("댓글 수정", currentContent)
  
  if (newContent === null || newContent.trim() === "") {
    return
  }

  const spinner = dom.showSpinner()

  try {
    await api.updateComment(commentId, newContent.trim())
    dom.showToast("댓글이 수정되었습니다")
    
    // Reload comments
    await loadComments()
  } catch (error) {
    console.error("Comment update error:", error)
    dom.showToast("댓글 수정에 실패했습니다", "error")
  } finally {
    dom.hideSpinner(spinner)
  }
}

// Delete comment
async function deleteComment(commentId) {
  if (!confirm("정말로 이 댓글을 삭제하시겠습니까?")) {
    return
  }

  const spinner = dom.showSpinner()

  try {
    await api.deleteComment(commentId)
    dom.showToast("댓글이 삭제되었습니다")
    
    // Reload comments
    await loadComments()
  } catch (error) {
    console.error("Comment deletion error:", error)
    dom.showToast("댓글 삭제에 실패했습니다", "error")
  } finally {
    dom.hideSpinner(spinner)
  }
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
