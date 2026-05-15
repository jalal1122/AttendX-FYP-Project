export default {
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/src/tests/setup/jest.setup.js"],
  clearMocks: true,
  restoreMocks: true,
  collectCoverageFrom: [
    "src/controllers/**/*.js",
    "src/middlewares/**/*.js",
    "src/models/**/*.js",
    "src/routes/**/*.js",
    "src/services/**/*.js",
    "src/utils/**/*.js",
  ],
  testMatch: ["<rootDir>/src/**/*.test.js", "<rootDir>/src/**/*.spec.js"],
};
