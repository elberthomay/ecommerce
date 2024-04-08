import type { Config } from "jest";

const config: Config = {
  verbose: true,
  moduleNameMapper: {
    "^@elycommerce/common$": "<rootDir>/../common/src",
  },
  preset: "ts-jest",
  testEnvironment: "node",
  setupFilesAfterEnv: ["./src/test/setup.ts"],
  testPathIgnorePatterns: ["<rootDir>/src/test", "<rootDir>/node_modules"],
};

export default config;
