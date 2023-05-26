module.exports = {
  testEnvironment: 'node',
  transform: {
    "^.+\\.tsx?$": "ts-jest"
  },
  moduleFileExtensions: [
    "ts",
    "tsx",
    "js",
    "jsx",
    "json",
    "node",
  ],
  
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(ts|js)x?$',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx,js,jsx}',
    '!src/**/*.d.ts',
  ],
  clearMocks: true,
  modulePathIgnorePatterns: ['<rootDir>/build'],
  // coverageReporters: [
  //   "lcov",
  //   "json-summary"
  // ],
  coverageReporters: ["cobertura", "lcov", "text"],
};
