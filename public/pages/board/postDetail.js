import { api } from "/js/api.js"
import { dom } from "/js/dom.js"
import { storage } from "/js/storage.js"
import { cdn } from "/js/cdn.js"

let currentPost = null
let currentPostId = null
let editSelectedImages = []
let editRemovedImageKeys = []

async function loadPostDetail() {
  currentPostId = new URLSearchParams(window.location.search).get("postId")

  if (!currentPostId) {
    showError("잘못된 접근입니다", "게시글 ID가 없습니다")
    return
  }

  const spinner = dom.showSpinner()

  try {
    currentPost = await api.getPostDetail(currentPostId)

    await renderPost(currentPost)
    
    // Load comments using API
    await loadComments()
  } catch (error) {
    console.error("Failed to load post:", error)
    showError("게시글을 불러오는데 실패했습니다", "다시 시도해주세요")
  } finally {
    dom.hideSpinner(spinner)
  }
}

async function renderPost(post) {
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
      // Load image using signed cookie
      try {
        const blob = await cdn.fetchImage(cdnBaseUrl, post.authorProfile.profileImageObjectKey)
        avatarElement.src = URL.createObjectURL(blob)
      } catch (error) {
        console.error("Failed to load author avatar:", error)
        avatarElement.src = "/user-profile-illustration.png"
      }
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
    
    // Load all images using signed cookie in order
    for (const key of post.imageObjectKeys) {
      const img = dom.create("img", {
        alt: "Post image",
        className: "post-image",
      })
      
      try {
        const blob = await cdn.fetchImage(cdnBaseUrl, key)
        img.src = URL.createObjectURL(blob)
      } catch (error) {
        console.error("Failed to load post image:", error)
        img.style.display = "none"
      }
      
      imagesContainer.appendChild(img)
    }
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
dom.qs("#edit-post-btn")?.addEventListener("click", async () => {
  const modal = dom.qs("#edit-post-modal")
  if (modal && currentPost) {
    // Reset state
    editSelectedImages = []
    editRemovedImageKeys = []
    
    // Populate modal with current post data
    dom.qs("#edit-post-title").value = currentPost.title
    dom.qs("#edit-post-content").value = currentPost.content
    
    // Update character count
    const contentCharCount = dom.qs("#edit-content-char-count")
    if (contentCharCount) {
      contentCharCount.textContent = currentPost.content.length
    }
    
    // Show existing images
    const imagePreviewContainer = dom.qs("#edit-image-preview-container")
    imagePreviewContainer.innerHTML = ""
    
    if (currentPost.imageObjectKeys && currentPost.imageObjectKeys.length > 0) {
      const cdnBaseUrl = currentPost.cdnBaseUrl || ""
      // Load images in order
      for (let index = 0; index < currentPost.imageObjectKeys.length; index++) {
        const key = currentPost.imageObjectKeys[index]
        try {
          const blob = await cdn.fetchImage(cdnBaseUrl, key)
          const imageUrl = URL.createObjectURL(blob)
          const preview = createImagePreview(imageUrl, index, true, key)
          imagePreviewContainer.appendChild(preview)
        } catch (error) {
          console.error("Failed to load edit image:", error)
        }
      }
    }
    
    modal.style.display = "flex"
  }
})

// Create image preview element
function createImagePreview(src, index, isExisting = false, objectKey = null) {
  const preview = dom.create("div", { className: "image-preview-item" }, [
    dom.create("img", { src, alt: `이미지 ${index + 1}` }),
    dom.create("button", { 
      type: "button", 
      className: "remove-image-btn",
      "data-index": index,
      "data-existing": isExisting,
      "data-object-key": objectKey || ""
    }, ["×"])
  ])
  
  return preview
}

// Delete post button
dom.qs("#delete-post-btn")?.addEventListener("click", () => {
  const modal = dom.qs("#delete-post-modal")
  if (modal) {
    modal.style.display = "flex"
  }
})

// Delete post modal handlers
const closeDeletePostModal = () => {
  const modal = dom.qs("#delete-post-modal")
  if (modal) {
    modal.style.display = "none"
  }
}

dom.qs("#close-delete-post-modal")?.addEventListener("click", closeDeletePostModal)
dom.qs("#cancel-delete-post-btn")?.addEventListener("click", closeDeletePostModal)

dom.qs("#confirm-delete-post-btn")?.addEventListener("click", async () => {
  closeDeletePostModal()
  
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

// Close modal on overlay click
dom.qs("#delete-post-modal")?.addEventListener("click", (e) => {
  if (e.target.id === "delete-post-modal") {
    closeDeletePostModal()
  }
})

// Edit post modal handlers
const editPostModal = dom.qs("#edit-post-modal")
const closeEditPostModalBtn = dom.qs("#close-edit-post-modal")
const cancelEditPostBtn = dom.qs("#cancel-edit-post-btn")
const editPostForm = dom.qs("#edit-post-form")
const editPostTitleInput = dom.qs("#edit-post-title")
const editPostContentInput = dom.qs("#edit-post-content")
const editContentCharCount = dom.qs("#edit-content-char-count")
const editImageInput = dom.qs("#edit-image-input")
const selectEditImagesBtn = dom.qs("#select-edit-images-btn")
const editImagePreviewContainer = dom.qs("#edit-image-preview-container")

const closeEditPostModal = () => {
  if (editPostModal) {
    editPostModal.style.display = "none"
    editSelectedImages = []
    editRemovedImageKeys = []
    editPostForm?.reset()
    editImagePreviewContainer.innerHTML = ""
  }
}

closeEditPostModalBtn?.addEventListener("click", closeEditPostModal)
cancelEditPostBtn?.addEventListener("click", closeEditPostModal)

// Close modal on overlay click
editPostModal?.addEventListener("click", (e) => {
  if (e.target.id === "edit-post-modal") {
    closeEditPostModal()
  }
})

// Character count for content
editPostContentInput?.addEventListener("input", () => {
  const count = editPostContentInput.value.length
  editContentCharCount.textContent = count
})

// Image selection
selectEditImagesBtn?.addEventListener("click", () => {
  editImageInput?.click()
})

editImageInput?.addEventListener("change", async (e) => {
  const files = Array.from(e.target.files || [])
  const imageError = dom.qs("#edit-image-error")
  imageError.textContent = ""

  // Calculate total images (existing + new)
  const existingImageCount = (currentPost?.imageObjectKeys?.length || 0) - editRemovedImageKeys.length
  const totalImages = existingImageCount + editSelectedImages.length + files.length

  if (totalImages > 3) {
    imageError.textContent = "이미지는 최대 3장까지 업로드할 수 있습니다"
    return
  }

  // Validate files
  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      imageError.textContent = "이미지 파일만 업로드할 수 있습니다"
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      imageError.textContent = "이미지 크기는 5MB를 초과할 수 없습니다"
      return
    }
  }

  // Add to selected images
  editSelectedImages.push(...files)

  // Show previews
  files.forEach((file, index) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const preview = createImagePreview(
        e.target.result, 
        existingImageCount + editSelectedImages.length - files.length + index, 
        false
      )
      editImagePreviewContainer.appendChild(preview)
    }
    reader.readAsDataURL(file)
  })

  editImageInput.value = ""
})

// Handle image removal
editImagePreviewContainer?.addEventListener("click", (e) => {
  if (e.target.classList.contains("remove-image-btn")) {
    const btn = e.target
    const isExisting = btn.dataset.existing === "true"
    const objectKey = btn.dataset.objectKey
    const index = parseInt(btn.dataset.index)

    if (isExisting && objectKey) {
      // Add to removed list
      editRemovedImageKeys.push(objectKey)
    } else {
      // Remove from new images array
      const newImageIndex = index - ((currentPost?.imageObjectKeys?.length || 0) - editRemovedImageKeys.length)
      if (newImageIndex >= 0 && newImageIndex < editSelectedImages.length) {
        editSelectedImages.splice(newImageIndex, 1)
      }
    }

    // Remove preview
    btn.closest(".image-preview-item")?.remove()
  }
})

// Submit edit form
editPostForm?.addEventListener("submit", async (e) => {
  e.preventDefault()

  const title = editPostTitleInput?.value.trim()
  const content = editPostContentInput?.value.trim()

  if (!title || !content) {
    dom.showToast("제목과 내용을 모두 입력해주세요", "error")
    return
  }

  const spinner = dom.showSpinner()

  try {
    let addedImageObjectKeys = []

    // Upload new images if any
    if (editSelectedImages.length > 0) {
      const files = editSelectedImages.map((file) => ({
        fileName: file.name,
        mimeType: file.type,
      }))

      const presignedData = await api.getPostPresignedUrls(files)
      const urls = presignedData.urls || []

      // Upload images to S3
      for (let i = 0; i < editSelectedImages.length; i++) {
        await api.uploadToS3(editSelectedImages[i], urls[i].presignedUrl)
        addedImageObjectKeys.push(urls[i].objectKey)
      }
    }

    // Update post
    await api.updatePost(currentPostId, {
      title,
      content,
      addedImageObjectKeys,
      removedImageObjectKeys: editRemovedImageKeys,
    })

    dom.showToast("게시물이 수정되었습니다")
    closeEditPostModal()

    // Reload post
    setTimeout(() => {
      window.location.reload()
    }, 1000)
  } catch (error) {
    console.error("Edit error:", error)
    dom.showToast(error.message || "게시물 수정에 실패했습니다", "error")
  } finally {
    dom.hideSpinner(spinner)
  }
})

// Load and render comments
async function loadComments() {
  try {
    console.log("📥 Loading comments for post:", currentPostId)
    const response = await api.getCommentList(currentPostId)
    console.log("📦 Comment response:", response)
    
    const comments = response.comments?.items || []
    const cdnBaseUrl = response.cdnBaseUrl || ""
    
    console.log("📝 Comments count:", comments.length)
    
    dom.qs("#comments-count").textContent = comments.length
    dom.qs("#comment-count").textContent = comments.length
    
    renderComments(comments, cdnBaseUrl)
    console.log("✅ Comments rendered successfully")
  } catch (error) {
    console.error("❌ Failed to load comments:", error)
    throw error // Re-throw to be caught by caller
  }
}

function renderComments(comments, cdnBaseUrl) {
  const commentsList = dom.qs("#comments-list")
  
  if (!commentsList) {
    console.error("❌ Comments list element not found")
    return
  }
  
  commentsList.innerHTML = ""

  if (!comments || comments.length === 0) {
    commentsList.innerHTML = '<div class="comments-empty">첫 댓글을 작성해보세요!</div>'
    return
  }

  console.log("🎨 Rendering", comments.length, "comments")
  comments.forEach((comment, index) => {
    try {
      const commentItem = createCommentItem(comment, cdnBaseUrl)
      commentsList.appendChild(commentItem)
      console.log(`✅ Rendered comment ${index + 1}`)
    } catch (error) {
      console.error(`❌ Error rendering comment ${index + 1}:`, error)
    }
  })
}

function createCommentItem(comment, cdnBaseUrl) {
  const item = dom.create("div", { className: "comment-item", "data-comment-id": comment.commentId })

  const header = dom.create("div", { className: "comment-header" })

  const authorInfo = dom.create("div", { className: "comment-author-info" })
  
  const avatar = dom.create("img", {
    src: "/user-profile-illustration.png", // Default placeholder
    alt: comment.author.name,
    className: "comment-avatar",
  })
  
  // Load avatar using signed cookie
  if (comment.author.profileImageObjectKey) {
    cdn.fetchImage(cdnBaseUrl, comment.author.profileImageObjectKey)
      .then((blob) => {
        avatar.src = URL.createObjectURL(blob)
      })
      .catch((error) => {
        console.error("Failed to load comment avatar:", error)
        // Keep default placeholder image
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
    console.log("🔹 Creating comment...")
    await api.createComment(currentPostId, content)
    console.log("✅ Comment created successfully")
    
    // Clear input first
    commentInput.value = ""
    
    // Update char count if element exists
    const charCountEl = dom.qs("#comment-char-count")
    if (charCountEl) {
      charCountEl.textContent = "0/500"
    }
    
    // Reload comments
    console.log("🔹 Reloading comments...")
    await loadComments()
    console.log("✅ Comments reloaded successfully")
    
    dom.showToast("댓글이 작성되었습니다")
  } catch (error) {
    console.error("❌ Comment creation error:", error)
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

let currentEditingCommentId = null

// Edit comment - inline editing
function editComment(commentId, currentContent) {
  // Cancel previous edit if any
  if (currentEditingCommentId && currentEditingCommentId !== commentId) {
    cancelEditComment()
  }
  
  currentEditingCommentId = commentId
  
  // Find the comment item
  const commentItem = dom.qs(`[data-comment-id="${commentId}"]`)
  if (!commentItem) return
  
  // Hide comment header
  const headerElement = commentItem.querySelector(".comment-header")
  if (headerElement) {
    headerElement.style.display = "none"
  }
  
  const contentElement = commentItem.querySelector(".comment-content")
  if (!contentElement) return
  
  // Create edit form
  const editForm = dom.create("div", { className: "comment-edit-form" })
  
  const textarea = dom.create("textarea", {
    className: "comment-edit-input",
    maxlength: "500",
    rows: "3"
  })
  textarea.value = currentContent
  
  const editActions = dom.create("div", { className: "comment-edit-actions" })
  
  const cancelBtn = dom.create("button", {
    type: "button",
    className: "btn-comment-action edit",
  }, ["취소"])
  cancelBtn.addEventListener("click", () => cancelEditComment())
  
  const saveBtn = dom.create("button", {
    type: "button",
    className: "btn-comment-action",
    style: "background: var(--color-primary); color: white; border-color: var(--color-primary);"
  }, ["저장"])
  saveBtn.addEventListener("click", () => saveEditComment(commentId))
  
  editActions.appendChild(cancelBtn)
  editActions.appendChild(saveBtn)
  
  editForm.appendChild(textarea)
  editForm.appendChild(editActions)
  
  // Replace content with edit form
  contentElement.replaceWith(editForm)
  
  // Focus textarea
  textarea.focus()
  textarea.setSelectionRange(textarea.value.length, textarea.value.length)
}

// Cancel edit comment
function cancelEditComment() {
  if (!currentEditingCommentId) return
  
  const commentId = currentEditingCommentId
  currentEditingCommentId = null
  
  // Reload comments to restore original view
  loadComments()
}

// Restore comment header visibility (called when editing is cancelled or saved)
function restoreCommentHeader(commentId) {
  const commentItem = dom.qs(`[data-comment-id="${commentId}"]`)
  if (commentItem) {
    const headerElement = commentItem.querySelector(".comment-header")
    if (headerElement) {
      headerElement.style.display = ""
    }
  }
}

// Save edit comment
async function saveEditComment(commentId) {
  const commentItem = dom.qs(`[data-comment-id="${commentId}"]`)
  if (!commentItem) return
  
  const textarea = commentItem.querySelector(".comment-edit-input")
  if (!textarea) return
  
  const newContent = textarea.value.trim()
  
  if (!newContent) {
    dom.showToast("댓글 내용을 입력해주세요", "error")
    return
  }
  
  if (newContent.length > 500) {
    dom.showToast("댓글은 최대 500자까지 작성할 수 있습니다", "error")
    return
  }
  
  const spinner = dom.showSpinner()

  try {
    await api.updateComment(commentId, newContent)
    dom.showToast("댓글이 수정되었습니다")
    
    currentEditingCommentId = null
    // Reload comments
    await loadComments()
  } catch (error) {
    console.error("Comment update error:", error)
    dom.showToast("댓글 수정에 실패했습니다", "error")
    // Restore header if error
    restoreCommentHeader(commentId)
  } finally {
    dom.hideSpinner(spinner)
  }
}

// Delete comment - using modal
function deleteComment(commentId) {
  currentEditingCommentId = commentId
  
  const modal = dom.qs("#delete-comment-modal")
  if (modal) {
    modal.style.display = "flex"
  }
}

// Delete comment modal handlers
const closeDeleteCommentModal = () => {
  const modal = dom.qs("#delete-comment-modal")
  if (modal) {
    modal.style.display = "none"
    currentEditingCommentId = null
  }
}

dom.qs("#close-delete-comment-modal")?.addEventListener("click", closeDeleteCommentModal)
dom.qs("#cancel-delete-comment-btn")?.addEventListener("click", closeDeleteCommentModal)

dom.qs("#confirm-delete-comment-btn")?.addEventListener("click", async () => {
  closeDeleteCommentModal()
  
  const spinner = dom.showSpinner()

  try {
    await api.deleteComment(currentEditingCommentId)
    dom.showToast("댓글이 삭제되었습니다")
    
    // Reload comments
    await loadComments()
  } catch (error) {
    console.error("Comment deletion error:", error)
    dom.showToast("댓글 삭제에 실패했습니다", "error")
  } finally {
    dom.hideSpinner(spinner)
    currentEditingCommentId = null
  }
})

// Close delete comment modal on overlay click
dom.qs("#delete-comment-modal")?.addEventListener("click", (e) => {
  if (e.target.id === "delete-comment-modal") {
    closeDeleteCommentModal()
  }
})

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
