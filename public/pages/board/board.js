import { api } from "/js/api.js"
import { dom } from "/js/dom.js"
import { cdn } from "/js/cdn.js"

// Initialize strategy from URL parameter
console.log("🌐 [Board] Full URL:", window.location.href)
console.log("🌐 [Board] Search params:", window.location.search)
const urlParams = new URLSearchParams(window.location.search)
const tabParam = urlParams.get("tab")
console.log("🌐 [Board] Tab param:", tabParam)
let currentStrategy = tabParam === "free" ? "RECENT" : "POPULAR"
console.log("🌐 [Board] Initial strategy:", currentStrategy)
let nextCursor = null
let hasNext = true
let isLoading = false
let searchQuery = ""

const postsList = dom.qs("#posts-list")
const loadingSentinel = dom.qs("#loading-sentinel")
const endMessage = dom.qs("#end-message")
const searchInput = dom.qs("#search-input")
const searchBtn = dom.qs("#search-btn")

// Post creation elements
const createPostBtn = dom.qs("#create-post-btn")
const createPostModal = dom.qs("#create-post-modal")
const closeCreatePostModal = dom.qs("#close-create-post-modal")
const createPostForm = dom.qs("#create-post-form")
const cancelCreatePostBtn = dom.qs("#cancel-create-post-btn")
const postTitleInput = dom.qs("#post-title")
const postContentInput = dom.qs("#post-content")
const contentCharCount = dom.qs("#content-char-count")
const imageInput = dom.qs("#image-input")
const selectImagesBtn = dom.qs("#select-images-btn")
const imagePreviewContainer = dom.qs("#image-preview-container")

let selectedImages = []

// Tab switching
dom.qsa(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    // Update active tab
    dom.qsa(".tab-btn").forEach((b) => b.classList.remove("active"))
    btn.classList.add("active")

    currentStrategy = btn.dataset.tab === "popular" ? "POPULAR" : "RECENT"
    resetPosts()
    loadPosts()
  })
})

// Initialize active tab based on URL parameter on page load
function initializeActiveTab() {
  const activeTab = tabParam === "free" ? "free" : "popular"
  dom.qsa(".tab-btn").forEach((btn) => {
    if (btn.dataset.tab === activeTab) {
      btn.classList.add("active")
      currentStrategy = activeTab === "free" ? "RECENT" : "POPULAR"
    } else {
      btn.classList.remove("active")
    }
  })
  resetPosts()
  loadPosts()
}

// Run initialization
initializeActiveTab()

// Search
searchBtn.addEventListener("click", handleSearch)
searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    handleSearch()
  }
})

function handleSearch() {
  searchQuery = searchInput.value.trim()
  resetPosts()
  loadPosts()
}

// Reset posts list
function resetPosts() {
  nextCursor = null
  hasNext = true
  postsList.innerHTML = ""
  endMessage.style.display = "none"
  loadingSentinel.style.display = "flex"
}

async function loadPosts() {
  if (isLoading || !hasNext) return

  isLoading = true

  try {
    const response = await api.getPosts({
      strategy: nextCursor ? undefined : currentStrategy,
      cursor: nextCursor,
    })

    const cdnBaseUrl = response.cdnBaseUrl || ""
    const { items, nextCursor: newCursor, hasNext: newHasNext } = response.posts || {}

    if (!items || items.length === 0) {
      hasNext = false
      loadingSentinel.style.display = "none"

      if (!nextCursor) {
        postsList.innerHTML = '<div class="empty-state">게시글이 없습니다</div>'
      } else {
        endMessage.style.display = "block"
      }
      return
    }

    items.forEach((post) => {
      postsList.appendChild(createPostCard(post, cdnBaseUrl))
    })

    nextCursor = newCursor
    hasNext = newHasNext

    // Check if there are more posts
    if (!hasNext) {
      loadingSentinel.style.display = "none"
      endMessage.style.display = "block"
    }
  } catch (error) {
    console.error("Failed to load posts:", error)
    dom.showToast("게시글을 불러오는데 실패했습니다", "error")
    hasNext = false
    loadingSentinel.style.display = "none"
  } finally {
    isLoading = false
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
  likeWrap.appendChild(dom.create("img", {
    src: "/like.png",
    alt: "like",
    className: `post-card-icon${post.like?.amILike ? " post-card-like--active" : ""}`,
  }))
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

// Infinite scroll with IntersectionObserver
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && hasNext && !isLoading) {
        loadPosts()
      }
    })
  },
  {
    rootMargin: "100px",
  },
)

observer.observe(loadingSentinel)

// Post creation functionality
createPostBtn.addEventListener("click", () => {
  createPostModal.style.display = "flex"
  document.body.style.overflow = "hidden"
})

closeCreatePostModal.addEventListener("click", closeCreatePostModalFunc)
cancelCreatePostBtn.addEventListener("click", closeCreatePostModalFunc)

// Close modal when clicking overlay
createPostModal.addEventListener("click", (e) => {
  if (e.target === createPostModal) {
    closeCreatePostModalFunc()
  }
})

function closeCreatePostModalFunc() {
  createPostModal.style.display = "none"
  document.body.style.overflow = "auto"
  createPostForm.reset()
  selectedImages = []
  updateImagePreviews()
  contentCharCount.textContent = "0/2000"
  // Clear errors
  dom.qs("#title-error").textContent = ""
  dom.qs("#content-error").textContent = ""
  dom.qs("#image-error").textContent = ""
}

// Content character count
postContentInput.addEventListener("input", () => {
  const length = postContentInput.value.length
  contentCharCount.textContent = `${length}/2000`
})

// Image selection
selectImagesBtn.addEventListener("click", () => {
  imageInput.click()
})

imageInput.addEventListener("change", (e) => {
  const files = Array.from(e.target.files)
  
  // Validate file count
  if (selectedImages.length + files.length > 3) {
    dom.showToast("최대 3장까지만 선택할 수 있습니다", "error")
    return
  }
  
  // Validate file types and sizes
  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      dom.showToast("이미지 파일만 업로드 가능합니다", "error")
      return
    }
    
    if (file.size > 5 * 1024 * 1024) {
      dom.showToast("파일 크기는 5MB 이하여야 합니다", "error")
      return
    }
  }
  
  // Add to selected images
  selectedImages.push(...files)
  updateImagePreviews()
})

function updateImagePreviews() {
  imagePreviewContainer.innerHTML = ""
  
  selectedImages.forEach((file, index) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const previewItem = dom.create("div", { className: "image-preview-item" }, [
        dom.create("img", { src: e.target.result, alt: `이미지 ${index + 1}` }),
        dom.create("button", { 
          type: "button", 
          className: "remove-image-btn",
          "data-index": index
        }, ["×"])
      ])
      
      imagePreviewContainer.appendChild(previewItem)
    }
    reader.readAsDataURL(file)
  })
}

// Handle image removal with event delegation
imagePreviewContainer?.addEventListener("click", (e) => {
  if (e.target.classList.contains("remove-image-btn")) {
    const index = parseInt(e.target.dataset.index)
    selectedImages.splice(index, 1)
    updateImagePreviews()
    // Reset file input
    imageInput.value = ""
  }
})

// Handle form submission
createPostForm.addEventListener("submit", async (e) => {
  e.preventDefault()
  
  const title = postTitleInput.value.trim()
  const content = postContentInput.value.trim()
  
  // Clear errors
  dom.qs("#title-error").textContent = ""
  dom.qs("#content-error").textContent = ""
  dom.qs("#image-error").textContent = ""
  
  // Validation
  if (!title) {
    dom.qs("#title-error").textContent = "제목을 입력해주세요"
    return
  }
  
  if (!content) {
    dom.qs("#content-error").textContent = "내용을 입력해주세요"
    return
  }
  
  if (selectedImages.length > 3) {
    dom.qs("#image-error").textContent = "최대 3장까지만 선택할 수 있습니다"
    return
  }
  
  const spinner = dom.showSpinner()
  
  try {
    let imageObjectKeys = []
    
    // Upload images if any
    if (selectedImages.length > 0) {
      // Prepare file metadata
      const files = selectedImages.map((file) => ({
        fileName: file.name,
        mimeType: file.type,
      }))

      // Get presigned URLs for all files
      const presignedData = await api.getPostPresignedUrls(files)
      const urls = presignedData.urls || []

      // Upload images to S3
      for (let i = 0; i < selectedImages.length; i++) {
        await api.uploadToS3(selectedImages[i], urls[i].presignedUrl)
        imageObjectKeys.push(urls[i].objectKey)
      }
    }
    
    // Create post
    await api.createPost({
      title,
      content,
      imageObjectKeys
    })
    
    dom.showToast("게시글이 등록되었습니다")
    
    // Close modal and refresh posts
    closeCreatePostModalFunc()
    resetPosts()
    loadPosts()
    
  } catch (error) {
    console.error("Post creation error:", error)
    dom.showToast(error.message || "게시글 등록에 실패했습니다", "error")
  } finally {
    dom.hideSpinner(spinner)
  }
})

// Initial load
loadPosts()
