/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "jsdom",
  testMatch: ["<rootDir>/src/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: { module: "commonjs" } }],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};
