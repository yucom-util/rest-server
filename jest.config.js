module.exports = {
  moduleFileExtensions: ['ts', 'js'],
  preset: 'ts-jest',
  testEnvironment: "node",
  testMatch: [
    "**/test/**/*.test.ts",
  ],
  collectCoverageFrom: [
    "src/**"
  ],
  "coverageThreshold": {
    "global": {
      "branches": 80,
      "functions": 80,
      "lines": 80,
      "statements": -10
    }
  }
};