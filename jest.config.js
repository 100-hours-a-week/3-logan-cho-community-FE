module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  collectCoverageFrom: ["server.js", "public/js/**/*.js"],
  coveragePathIgnorePatterns: ["/node_modules/"],
  testTimeout: 10000,
  verbose: true
}
