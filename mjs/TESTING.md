# Testing Guide

This monorepo uses Jest with a workspace/project configuration to run all tests in a single Jest instance for better performance and unified reporting.

## Quick Start

### Run All Tests (All Workspaces)

```bash
# Run all tests without coverage (fast)
npm test

# Run all tests with coverage report
npm run test:coverage

# Watch mode - re-run tests on file changes
npm run test:watch
```

### Run Tests for Specific Workspace

```bash
# Run tests for a specific package
npm run test:comments
npm run test:components
npm run test:files
npm run test:projects
npm run test:variables
npm run test:webhooks
npm run test:dev-resources
npm run test:library-analytics

# Or run directly from workspace directory
cd comments
npm test
```

### Run Tests with Jest CLI Options

```bash
# Run specific test file
npm test -- --testPathPattern=client.test.mjs

# Run specific test by name
npm test -- --testNamePattern="should handle errors"

# Run tests for specific project only
npm test -- --selectProjects comments

# Run tests in watch mode for specific project
npm test -- --watch --selectProjects files

# Update snapshots
npm test -- --updateSnapshot
```

## Project Structure

```
mjs/
├── jest.config.mjs           # Root Jest configuration (projects setup)
├── jest.base.config.mjs      # Shared base configuration
├── comments/
│   ├── jest.config.mjs       # Workspace config (extends base)
│   └── tests/
├── components/
│   ├── jest.config.mjs
│   └── tests/
├── files/
│   ├── jest.config.mjs
│   └── tests/
└── ... (other workspaces)
```

## Configuration Files

### Root Config (`jest.config.mjs`)
- Defines all workspace projects
- Configures monorepo-wide coverage settings
- Sets coverage thresholds and reporters

### Base Config (`jest.base.config.mjs`)
- Shared settings used by all workspaces
- Common test patterns and ignore rules
- Mock behavior configuration

### Workspace Configs
Each workspace has its own `jest.config.mjs` that:
- Extends the base configuration
- Sets a displayName for the project
- Customizes testMatch patterns if needed
- Overrides coverage settings if needed

## Coverage Reports

```bash
# Generate coverage for entire monorepo
npm run test:coverage

# Coverage reports are generated in:
# - coverage/lcov-report/index.html (HTML report)
# - coverage/lcov.info (LCOV format)
# - coverage/coverage-final.json (JSON format)

# View HTML coverage report
open coverage/lcov-report/index.html
```

## Benefits of This Setup

1. **Single Jest Instance**: All tests run in one process, reducing overhead
2. **Unified Coverage**: Get combined coverage reports across all packages
3. **Faster CI/CD**: Run all tests together instead of serially per package
4. **Shared Configuration**: Reduce duplication with base config
5. **Flexible Testing**: Can still test individual workspaces when needed
6. **Better Performance**: Jest can parallelize tests across projects

## Troubleshooting

### Tests Not Found

If Jest can't find your tests, check:
1. Test files match the pattern in `testMatch` (default: `**/tests/**/*.test.mjs`)
2. Files are not in ignored directories (`node_modules`, `dist`, etc.)

### Module Resolution Issues

If you see module import errors:
1. Ensure `type: "module"` is set in package.json
2. Use `.mjs` extension for ES modules
3. Check that `transform: {}` is set (no transformation for ES modules)

### Coverage Threshold Errors

If coverage thresholds fail:
1. Adjust thresholds in `jest.config.mjs`
2. Write more tests to increase coverage
3. Or run without coverage: `npm test` (coverage is opt-in)

## CI/CD Integration

For continuous integration, add to your workflow:

```yaml
# Example GitHub Actions
- name: Run Tests
  run: npm test

- name: Run Tests with Coverage
  run: npm run test:coverage

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

## Advanced Usage

### Running Specific Suites

```bash
# Run only unit tests
npm test -- --testPathPattern=/unit/

# Run tests matching a pattern
npm test -- comments/tests/unit/client

# Run tests in specific projects
npm test -- --selectProjects comments components
```

### Debugging Tests

```bash
# Run with Node debugger
node --experimental-vm-modules --inspect-brk ./node_modules/.bin/jest --runInBand

# Run single test file
npm test -- --testPathPattern=client.test.mjs --runInBand
```

### Performance Tuning

```bash
# Limit concurrent workers
npm test -- --maxWorkers=4

# Run tests serially (useful for debugging)
npm test -- --runInBand

# Clear Jest cache if tests behave unexpectedly
npm test -- --clearCache
```
