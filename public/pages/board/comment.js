import { api } from "/js/api.js"
import { dom } from "/js/dom.js"
import { storage } from "/js/storage.js"

let currentPostId = null
let comments = []
let editingCommentId = null

/**
 * Initialize comment functionality
 * @param {string} postId - The post ID
 * @param {Array} initialComments - Initial comments data
 */
export function initComments(postId, initialComments = []) {
  currentPostId = postId
  comments = initialComments

  setupCommentForm()
  renderComments()
  updateCommentsCount()
}

/**
 * Setup comment form
 */
function setupCommentForm() {
  const form = dom.qs("#comment-form")
  const input = dom.qs("#comment-input")
  const charCount = dom.qs("#comment-char-count")
  const formContainer = dom.qs("#comment-form-container")

  // Check if user is logged in
  if (!storage.hasToken()) {
    formContainer.innerHTML = `
      <div class="comment-login-prompt">
        <p>댓글을 작성하려면 로그인이 필요합니다</p>
        <button class="btn-login-prompt" onclick="window.location.href='/login'">로그인</button>
      </div>
    `
    return
  }

  // Character count
  input.addEventListener("input", () => {
    const length = input.value.length
    charCount.textContent = `${length}/500`
  })

  // Form submit
  form.addEventListener("submit", async (e) => {
    e.preventDefault()
    await handleCreateComment()
  })
}

/**
 * Handle create comment
 */
async function handleCreateComment() {
  const input = dom.qs("#comment-input")
  const content = input.value.trim()

  if (!content) {
    dom.showToast("댓글 내용을 입력해주세요", "error")
    return
  }

  const submitBtn = dom.qs(".btn-submit-comment")
  submitBtn.disabled = true
  submitBtn.textContent = "작성 중..."

  try {
    await api.createComment(currentPostId, content)

    // Clear input
    input.value = ""
    dom.qs("#comment-char-count").textContent = "0/500"

    // Reload comments
    await reloadComments()

    dom.showToast("댓글이 작성되었습니다", "success")
  } catch (error) {
    console.error("Failed to create comment:", error)
    dom.showToast("댓글 작성에 실패했습니다", "error")
  } finally {
    submitBtn.disabled = false
    submitBtn.textContent = "댓글 작성"
  }
}

/**
 * Render comments
 */
function renderComments() {
  const commentsList = dom.qs("#comments-list")

  if (!comments || comments.length === 0) {
    commentsList.innerHTML = `
      <div class="comments-empty">
        아직 댓글이 없습니다. 첫 댓글을 작성해보세요!
      </div>
    `
    return
  }

  commentsList.innerHTML = comments
    .map((comment) => {
      if (editingCommentId === comment.commentId) {
        return createEditCommentHTML(comment)
      }
      return createCommentHTML(comment)
    })
    .join("")

  // Attach event listeners
  attachCommentEventListeners()
}

/**
 * Create comment HTML
 */
function createCommentHTML(comment) {
  const isOwner = comment.isOwner || false
  const formattedDate = formatDate(comment.createdAt)

  return `
    <div class="comment-item" data-comment-id="${comment.commentId}">
      <div class="comment-header">
        <div class="comment-author-info">
          <img 
            src="${comment.author?.profileImageUrl || "/user-profile-illustration.png"}" 
            alt="${comment.author?.name || "User"}" 
            class="comment-avatar"
          />
          <div class="comment-author-details">
            <span class="comment-author-name">${comment.author?.name || "익명"}</span>
            <span class="comment-date">${formattedDate}</span>
          </div>
        </div>
        ${
          isOwner
            ? `
          <div class="comment-actions">
            <button class="btn-comment-action edit" data-action="edit" data-comment-id="${comment.commentId}">
              수정
            </button>
            <button class="btn-comment-action delete" data-action="delete" data-comment-id="${comment.commentId}">
              삭제
            </button>
          </div>
        `
            : ""
        }
      </div>
      <div class="comment-content">${escapeHtml(comment.content)}</div>
    </div>
  `
}

/**
 * Create edit comment HTML
 */
function createEditCommentHTML(comment) {
  return `
    <div class="comment-item" data-comment-id="${comment.commentId}">
      <div class="comment-header">
        <div class="comment-author-info">
          <img 
            src="${comment.author?.profileImageUrl || "/user-profile-illustration.png"}" 
            alt="${comment.author?.name || "User"}" 
            class="comment-avatar"
          />
          <div class="comment-author-details">
            <span class="comment-author-name">${comment.author?.name || "익명"}</span>
          </div>
        </div>
      </div>
      <div class="comment-edit-form">
        <textarea 
          class="comment-edit-input" 
          data-comment-id="${comment.commentId}"
          maxlength="500"
        >${escapeHtml(comment.content)}</textarea>
        <div class="comment-edit-actions">
          <button class="btn-comment-edit btn-comment-cancel" data-action="cancel-edit">
            취소
          </button>
          <button class="btn-comment-edit btn-comment-save" data-action="save-edit" data-comment-id="${comment.commentId}">
            저장
          </button>
        </div>
      </div>
    </div>
  `
}

/**
 * Attach event listeners to comment actions
 */
function attachCommentEventListeners() {
  // Edit buttons
  dom.qsAll('[data-action="edit"]').forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const commentId = e.target.dataset.commentId
      handleEditComment(commentId)
    })
  })

  // Delete buttons
  dom.qsAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const commentId = e.target.dataset.commentId
      handleDeleteComment(commentId)
    })
  })

  // Save edit buttons
  dom.qsAll('[data-action="save-edit"]').forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const commentId = e.target.dataset.commentId
      handleSaveEdit(commentId)
    })
  })

  // Cancel edit buttons
  dom.qsAll('[data-action="cancel-edit"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      editingCommentId = null
      renderComments()
    })
  })
}

/**
 * Handle edit comment
 */
function handleEditComment(commentId) {
  editingCommentId = commentId
  renderComments()
}

/**
 * Handle save edit
 */
async function handleSaveEdit(commentId) {
  const textarea = dom.qs(`.comment-edit-input[data-comment-id="${commentId}"]`)
  const content = textarea.value.trim()

  if (!content) {
    dom.showToast("댓글 내용을 입력해주세요", "error")
    return
  }

  try {
    await api.updateComment(currentPostId, commentId, content)

    editingCommentId = null
    await reloadComments()

    dom.showToast("댓글이 수정되었습니다", "success")
  } catch (error) {
    console.error("Failed to update comment:", error)
    dom.showToast("댓글 수정에 실패했습니다", "error")
  }
}

/**
 * Handle delete comment
 */
async function handleDeleteComment(commentId) {
  if (!confirm("댓글을 삭제하시겠습니까?")) {
    return
  }

  try {
    await api.deleteComment(currentPostId, commentId)

    await reloadComments()

    dom.showToast("댓글이 삭제되었습니다", "success")
  } catch (error) {
    console.error("Failed to delete comment:", error)
    dom.showToast("댓글 삭제에 실패했습니다", "error")
  }
}

/**
 * Reload comments from API
 */
async function reloadComments() {
  try {
    // Fetch updated post detail to get latest comments
    const postDetail = await api.getPostDetail(currentPostId)
    comments = postDetail.comments || []
    renderComments()
    updateCommentsCount()
  } catch (error) {
    console.error("Failed to reload comments:", error)
  }
}

/**
 * Update comments count
 */
function updateCommentsCount() {
  const countElement = dom.qs("#comments-count")
  if (countElement) {
    countElement.textContent = comments.length
  }
}

/**
 * Format date
 */
function formatDate(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date

  // Less than 1 minute
  if (diff < 60000) {
    return "방금 전"
  }

  // Less than 1 hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000)
    return `${minutes}분 전`
  }

  // Less than 1 day
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000)
    return `${hours}시간 전`
  }

  // Less than 7 days
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000)
    return `${days}일 전`
  }

  // Default format
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement("div")
  div.textContent = text
  return div.innerHTML
}
