/**
 * CDN Helper for image fetching using signed cookies
 * Dynamically uses the cdnBaseUrl provided from the backend response
 */
export const cdn = {
    /**
     * Get full CloudFront URL for a given objectKey
     * @param {string} cdnBaseUrl
     * @param {string} objectKey
     */
    getUrl(cdnBaseUrl, objectKey) {
      if (!cdnBaseUrl) throw new Error("cdnBaseUrl is required")
      return `${cdnBaseUrl.replace(/\/$/, "")}/${objectKey}`
    },
  
    /**
     * Load a single image (automatically includes signed cookies)
     * @param {string} cdnBaseUrl
     * @param {string} objectKey
     * @returns {Promise<Blob>}
     */
    async fetchImage(cdnBaseUrl, objectKey) {
      const url = this.getUrl(cdnBaseUrl, objectKey)
      const response = await fetch(url, {
        credentials: "include", // attach signed cookies automatically
      })
  
      if (!response.ok) {
        throw new Error(`Failed to load image: ${objectKey}`)
      }
  
      return await response.blob()
    },
  
    /**
     * Load multiple images concurrently
     * @param {string} cdnBaseUrl
     * @param {string[]} objectKeys
     * @returns {Promise<Blob[]>}
     */
    async fetchImages(cdnBaseUrl, objectKeys) {
      if (!Array.isArray(objectKeys) || objectKeys.length === 0) {
        return []
      }
  
      const promises = objectKeys.map((key) => this.fetchImage(cdnBaseUrl, key))
      return await Promise.all(promises)
    },
  }
  