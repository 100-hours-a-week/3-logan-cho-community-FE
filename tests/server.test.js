const request = require("supertest")
const app = require("../server")

describe("Health Check Tests", () => {
  describe("GET /", () => {
    it("should return 200 status", async () => {
      const response = await request(app).get("/")
      expect(response.status).toBe(200)
      expect(response.type).toBe("text/html")
    })
  })

  describe("Critical Routes", () => {
    const routes = [
      "/login",
      "/signup",
      "/recover",
      "/board",
      "/mypage"
    ]

    routes.forEach((route) => {
      it(`should return 200 for ${route}`, async () => {
        const response = await request(app).get(route)
        expect(response.status).toBe(200)
      })
    })
  })
})
