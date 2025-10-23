// @cdn.js
import { api } from "./api.js"

/**
 * CloudFront + Signed-Cookie 이미지 헬퍼
 * - 최초 요청에서 401/403이면 issueSignedCookie를 '한 번만' 호출하고 재시도
 * - 동시 다발 요청도 발급은 1회만 수행 (in-flight promise 공유)
 */
export const cdn = {
  // 내부 상태
  _cookieReady: false,
  _issuingPromise: null,

  getUrl(cdnBaseUrl, objectKey) {
    if (!cdnBaseUrl) throw new Error("cdnBaseUrl is required")
    // 중복 슬래시 방지(경로 구조는 유지)
    if (cdnBaseUrl.endsWith("/") && objectKey.startsWith("/")) {
      return cdnBaseUrl + objectKey.slice(1)
    }
    if (!cdnBaseUrl.endsWith("/") && !objectKey.startsWith("/")) {
      return `${cdnBaseUrl}/${objectKey}`
    }
    return cdnBaseUrl + objectKey
  },

  async _ensureCookieOnce() {
    if (this._cookieReady) return
    if (!this._issuingPromise) {
      // Authorization 헤더가 필요한 엔드포인트라면 api.issueSignedCookie 내부에서 처리됨
      this._issuingPromise = api.issueSignedCookie()
        .then(() => { this._cookieReady = true })
        .finally(() => { this._issuingPromise = null })
    }
    return this._issuingPromise
  },

  /**
   * 사인드 쿠키 포함하여 이미지 1개 로드 (실패 시 1회만 쿠키 발급 후 재시도)
   * @returns {Promise<Blob>}
   */
  async fetchImage(cdnBaseUrl, objectKey) {
    const url = this.getUrl(cdnBaseUrl, objectKey)

    // 1차 시도
    let res = await fetch(url, { credentials: "include" })

    // 쿠키 없어서 접근 거부 시(보통 401/403), 딱 1회만 쿠키 발급 후 재시도
    if ((res.status === 401 || res.status === 403) && !this._cookieReady) {
      await this._ensureCookieOnce()
      res = await fetch(url, { credentials: "include" })
    }

    if (!res.ok) {
      // CORS/정책에 따라 0(opaque) 나오면 서버/헤더 설정 확인 필요
      throw new Error(`Failed to load image (${res.status}): ${objectKey}`)
    }
    return await res.blob()
  },

  /**
   * 이미지 여러 개 동시 로드 (각 항목 독립 재시도)
   * 실패한 것만 에러를 던지고 싶으면 Promise.allSettled 활용 가능
   */
  async fetchImages(cdnBaseUrl, objectKeys) {
    if (!Array.isArray(objectKeys) || objectKeys.length === 0) return []
    // 개별 재시도 처리. 전체 실패 방지하려면 allSettled로 바꿔도 됨.
    return await Promise.all(objectKeys.map(k => this.fetchImage(cdnBaseUrl, k)))
  },
}
