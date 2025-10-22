// LocalStorage helpers for token and user management

const TOKEN_KEY = "auth_token"
const USER_KEY = "user_info"

const storage = {
  // Token management
  setToken(token) {
    localStorage.setItem(TOKEN_KEY, token)
  },

  getToken() {
    return localStorage.getItem(TOKEN_KEY)
  },

  clearToken() {
    localStorage.removeItem(TOKEN_KEY)
  },

  hasToken() {
    return !!this.getToken()
  },

  // User info management
  setUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  },

  getUser() {
    const user = localStorage.getItem(USER_KEY)
    return user ? JSON.parse(user) : null
  },

  clearUser() {
    localStorage.removeItem(USER_KEY)
  },

  // Clear all auth data
  clearAll() {
    this.clearToken()
    this.clearUser()
  },
}

export { storage }
