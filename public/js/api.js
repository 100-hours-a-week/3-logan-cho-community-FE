import { config } from "./config.js"
import { storage } from "./storage.js"
import { dom } from "./dom.js"

/**
 * Centralized API request handler
 * Handles standardized Spring Boot response format: { isSuccess, code, message, data }
 */
const api = {
  /**
   * Parse standardized API response
   * Expected format: { isSuccess, code, message, data }
   */
  async parseResponse(response) {
    const contentType = response.headers.get("content-type")

    // Handle empty responses (204, DELETE operations)
    if (response.status === 204 || !contentType || !contentType.includes("application/json")) {
      return null
    }

    const json = await response.json()

    // Check if request was successful
    if (json.isSuccess === false || !response.ok) {
      throw new Error(json.message || "API request failed")
    }

    // Return the data field from standardized response
    return json.data
  },

  /**
   * Refresh access token using HttpOnly refresh cookie
   */
  async refreshAccessToken() {
    try {
      const response = await fetch(`${config.API_BASE_URL}/api/auth`, {
        method: "PUT",
        credentials: "include", // Include refresh token cookie
      })

      if (!response.ok) {
        throw new Error("Token refresh failed")
      }

      const data = await this.parseResponse(response)
      if (data && data.accessJwt) {
        storage.setToken(data.accessJwt)
        return data.accessJwt
      }

      throw new Error("No token in refresh response")
    } catch (error) {
      console.error("Token refresh error:", error)
      storage.clearAll()
      window.location.href = "/login"
      throw error
    }
  },

  /**
   * Regular API request with Authorization header
   */
  async request(method, endpoint, options = {}) {
    const { params, body, headers = {}, skipAuth = false, isRetry = false } = options

    // Build URL with query params
    const url = new URL(`${config.API_BASE_URL}${endpoint}`)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value)
        }
      })
    }

    // Build headers
    const requestHeaders = {
      "Content-Type": "application/json",
      ...headers,
    }

    if (!skipAuth && storage.hasToken()) {
      requestHeaders["Authorization"] = `Bearer ${storage.getToken()}`
    }

    // Build fetch options
    const fetchOptions = {
      method,
      headers: requestHeaders,
    }

    if (body) {
      fetchOptions.body = JSON.stringify(body)
    }

    try {
      const response = await fetch(url.toString(), fetchOptions)

      // Handle 401 with token refresh
      if (response.status === 401 && !isRetry && !skipAuth) {
        try {
          await this.refreshAccessToken()
          // Retry the original request with new token
          return await this.request(method, endpoint, { ...options, isRetry: true })
        } catch (refreshError) {
          // Refresh failed, redirect to login
          dom.showToast("로그인이 필요합니다", "error")
          setTimeout(() => {
            window.location.href = "/login"
          }, 1000)
          throw new Error("Unauthorized")
        }
      }

      const data = await this.parseResponse(response)
      return data
    } catch (error) {
      console.error("API Error:", error)
      throw error
    }
  },

  /**
   * Request with credentials (HttpOnly cookie)
   * Used for: POST /api/auth (login), PUT /api/auth (refresh), POST /api/images/signed-cookie
   */
  async requestWithCredentials(method, endpoint, options = {}) {
    const { body, headers = {}, includeAuth = false } = options

    const url = `${config.API_BASE_URL}${endpoint}`

    // Build headers
    const requestHeaders = {
      "Content-Type": "application/json",
      ...headers,
    }

    // Add Authorization header if needed (for signed-cookie endpoint)
    if (includeAuth && storage.hasToken()) {
      requestHeaders["Authorization"] = `Bearer ${storage.getToken()}`
    }

    // Build fetch options
    const fetchOptions = {
      method,
      headers: requestHeaders,
      credentials: "include", // Include HttpOnly cookies
    }

    if (body) {
      fetchOptions.body = JSON.stringify(body)
    }

    try {
      const response = await fetch(url, fetchOptions)
      const data = await this.parseResponse(response)
      return data
    } catch (error) {
      console.error("API Error:", error)
      throw error
    }
  },

  // Convenience methods
  get(endpoint, options) {
    return this.request("GET", endpoint, options)
  },

  post(endpoint, body, options = {}) {
    return this.request("POST", endpoint, { ...options, body })
  },

  put(endpoint, body, options = {}) {
    return this.request("PUT", endpoint, { ...options, body })
  },

  patch(endpoint, body, options = {}) {
    return this.request("PATCH", endpoint, { ...options, body })
  },

  delete(endpoint, options) {
    return this.request("DELETE", endpoint, options)
  },

  // ==================== Auth API ====================

  /**
   * Login
   * POST /api/auth
   * @param {string} email
   * @param {string} password
   * @param {string} deviceId
   * @returns {Promise<{accessJwt: string}>}
   */
  async login(email, password, deviceId) {
    return await this.requestWithCredentials("POST", "/api/auth", {
      body: { email, password, deviceId },
    })
  },

  /**
   * Logout
   * DELETE /api/auth
   */
  async logout() {
    return await this.delete("/api/auth")
  },

  // ==================== Post API ====================

  /**
 * Get posts with cursor-based pagination
 * GET /api/posts?strategy=RECENT|POPULAR&cursor=xxx
 * @param {Object} params - { strategy?: 'RECENT'|'POPULAR', cursor?: string }
 * @returns {Promise<{
 *   cdnBaseUrl: string,
  *   posts: {
  *     items: Array<{
  *       postId: string,
  *       title: string,
  *       views: number,
  *       createdAt: string,
  *       author: { id: number, name: string, profileImageObjectKey: string },
  *       like: { count: number, amILike: boolean }
  *     }>,
  *     nextCursor: string,
  *     hasNext: boolean
  *   }
  * }>}
  */
 
  async getPosts({ strategy, cursor }) {
    const params = cursor ? { cursor } : { strategy }
    return await this.get("/api/posts", { params })
  },

  /**
 * Get post detail
 * GET /api/posts/{postId}
 * @param {string} postId
 * @returns {Promise<{
 *   cdnBaseUrl: string,
  *   title: string,
  *   content: string,
  *   imageObjectKeys: string[],
  *   authorProfile: { id: number, name: string, profileImageObjectKey: string },
  *   views: number,
  *   likes: number,
  *   amILiking: boolean,
  *   createdAt: string,
  *   isUpdated: boolean,
  *   isMine: boolean
  * }>}
  */
  async getPostDetail(postId) {
    return await this.get(`/api/posts/${postId}`)
  },

  /**
   * Create post
   * POST /api/posts
   * @param {Object} data - { title, content, imageObjectKeys }
   */
  async createPost(data) {
    return await this.post("/api/posts", data)
  },

  /**
   * Update post
   * PUT /api/posts/{postId}
   * @param {string} postId
   * @param {Object} data - { title, content, addedImageObjectKeys, removedImageObjectKeys }
   */
  async updatePost(postId, data) {
    return await this.put(`/api/posts/${postId}`, data)
  },

  /**
   * Delete post
   * DELETE /api/posts/{postId}
   * @param {string} postId
   */
  async deletePost(postId) {
    return await this.delete(`/api/posts/${postId}`)
  },

  /**
   * Like post
   * POST /api/posts/{postId}/likes
   * @param {string} postId
   */
  async likePost(postId) {
    return await this.post(`/api/posts/${postId}/likes`)
  },

  /**
   * Unlike post
   * DELETE /api/posts/{postId}/likes
   * @param {string} postId
   */
  async unlikePost(postId) {
    return await this.delete(`/api/posts/${postId}/likes`)
  },

  // ==================== Comment API ====================

  /**
   * Create comment
   * POST /api/posts/{postId}/comments
   * @param {string} postId
   * @param {string} content
   */
  async createComment(postId, content) {
    return await this.post(`/api/posts/${postId}/comments`, { content })
  },

    /**
   * Get comments for a post (with isMine)
   * GET /api/posts/{postId}/comments
   * @param {string} postId
   * @param {string} [cursor]
   * @returns {Promise<{
    *   cdnBaseUrl: string,
    *   parentId: string,
    *   comments: {
    *     items: Array<{
    *       commentId: string,
    *       content: string,
    *       createdAt: string,
    *       isUpdated: boolean,
    *       isMine: boolean,
    *       author: { id: number, name: string, profileImageObjectKey: string }
    *     }>,
    *     nextCursor: string,
    *     hasNext: boolean
    *   }
    * }>}
    */
   async getCommentList(postId, cursor) {
     const params = cursor ? { cursor } : undefined
     return await this.get(`/api/posts/${postId}/comments`, { params })
   },

  /**
   * Update comment
   * PUT /api/posts/comments/{commentId}
   * @param {string} commentId
   * @param {string} content
   */
  async updateComment( commentId, content) {
    return await this.put(`/api/posts/comments/${commentId}`, { content })
  },

  /**
   * Delete comment
   * DELETE /api/posts/comments/{commentId}
   * @param {string} commentId
   */
  async deleteComment( commentId) {
    return await this.delete(`/api/posts/comments/${commentId}`)
  },

  // ==================== Member API ====================

  /**
 * Get my profile (includes email)
 * GET /api/members
 * @returns {Promise<{ memberId: number, name: string, imageObjectKey: string, email: string }>}
 */

  async getProfile() {
    return await this.get("/api/members")
  },

  /**
   * Register (Sign up)
   * POST /api/members
   * @param {Object} data - { email, password, name, imageObjectKey }
   */
  async register(data) {
    return await this.post("/api/members", data, { skipAuth: true })
  },

  /**
 * Check email duplication
 * POST /api/auth/check-email
 * @param {string} email
 * @returns {Promise<boolean>} - true if available, false if duplicate
 */
async checkEmailDuplicate(email) {
  return await this.post("/api/auth/check-email", { email }, { skipAuth: true })
},

  /**
   * Delete account
   * DELETE /api/members
   */
  async deleteAccount() {
    return await this.delete("/api/members")
  },

  /**
   * Update name
   * PATCH /api/members/names
   * @param {string} name
   */
  async updateName(name) {
    return await this.patch("/api/members/names", { name })
  },

  /**
   * Update password
   * PATCH /api/members/passwords
   * @param {string} oldPassword
   * @param {string} newPassword
   */
  async updatePassword(oldPassword, newPassword) {
    return await this.patch("/api/members/passwords", { oldPassword, newPassword })
  },

  /**
   * Update profile image
   * PATCH /api/members/profileImages
   * @param {string} imageObjectKey
   */
  async updateProfileImage(imageObjectKey) {
    return await this.patch("/api/members/profileImages", { imageObjectKey })
  },

  // ==================== S3 API ====================

  /**
 * Get presigned URLs for post images
 * POST /api/posts/images/presigned-url
 * @param {Array<{ fileName: string, mimeType: string }>} files
 * @returns {Promise<{ urls: Array<{ presignedUrl: string, objectKey: string }> }>}
 */
  async getPostPresignedUrls(files) {
    return await this.post(`/api/posts/images/presigned-url`, { files })
  },

  /**
   * Get presigned URL for profile image
   * POST /api/members/images/presigned-url
   * @param {string} fileName
   * @param {string} mimeType
   * @returns {Promise<{presignedUrl, objectKey}>}
   */
  async getProfilePresignedUrl(fileName, mimeType) {
    return await this.post("/api/members/images/presigned-url", { fileName, mimeType })
  },

  /**
   * Issue signed cookie for S3 access
   * POST /api/images/signed-cookie
   * Requires Authorization header + credentials: "same-origin"
   */
  async issueSignedCookie() {
    const url = `${config.API_BASE_URL}/api/images/signed-cookie`

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${storage.getToken()}`,
      },
      credentials: "same-origin", // Store cookie but don't send it
    })

    if (!response.ok) {
      throw new Error("Failed to issue signed cookie")
    }

    return await this.parseResponse(response)
  },

  /**
   * Upload file to S3 using presigned URL
   * @param {File} file
   * @param {string} presignedUrl
   */
  async uploadToS3(file, presignedUrl) {
    const response = await fetch(presignedUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    })

    if (!response.ok) {
      throw new Error("S3 upload failed")
    }

    return response
  },
}

export { api }
