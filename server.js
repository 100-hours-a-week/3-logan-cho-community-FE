const express = require("express")
const path = require("path")
require("dotenv").config()

const app = express()
const PORT = process.env.PORT || 3000

// Serve static files from public directory
app.use(express.static(path.join(__dirname, "public")))

// Route mappings for clean URLs
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/pages/home/index.html"))
})

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public/pages/auth/login/login.html"))
})

app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "public/pages/auth/signup/signup.html"))
})

app.get("/board", (req, res) => {
  res.sendFile(path.join(__dirname, "public/pages/board/board.html"))
})

app.get("/board/detail", (req, res) => {
  res.sendFile(path.join(__dirname, "public/pages/board/postDetail.html"))
})

app.get("/mypage", (req, res) => {
  res.sendFile(path.join(__dirname, "public/pages/mypage/mypage.html"))
})

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`)
  console.log(`📁 Serving static files from /public`)
})
