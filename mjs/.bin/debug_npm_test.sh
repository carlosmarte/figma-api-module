#!/usr/bin/env bash

# Debug NPM Test Script
# Runs 'npm run test' and logs all output and errors to ./logs directory
# Shows real-time progress with test counts and percentages
# Usage: ./.bin/debug_npm_test.sh

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Setup
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOGS_DIR="$PROJECT_ROOT/logs"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$LOGS_DIR/npm-test-$TIMESTAMP.log"
ERROR_LOG_FILE="$LOGS_DIR/npm-test-errors-$TIMESTAMP.log"
PROGRESS_LOG="$LOGS_DIR/npm-test-progress-$TIMESTAMP.log"

# Create logs directory
mkdir -p "$LOGS_DIR"

# Function to log to both console and file
log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

# Header
log "${BOLD}${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
log "${BOLD}${BLUE}║              Debug NPM Test Runner with Logging               ║${NC}"
log "${BOLD}${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
log ""
log "${CYAN}Started at: $(date)${NC}"
log "${CYAN}Log file: $LOG_FILE${NC}"
log "${CYAN}Error log: $ERROR_LOG_FILE${NC}"
log "${CYAN}Progress log: $PROGRESS_LOG${NC}"
log ""

cd "$PROJECT_ROOT"

# First, get total test count
log "${BOLD}${CYAN}Counting total tests...${NC}"
total_tests=$(node --experimental-vm-modules ./node_modules/.bin/jest --listTests 2>/dev/null | wc -l | tr -d ' ')

if [ "$total_tests" -eq 0 ]; then
    log "${YELLOW}Could not determine total test count, running without progress tracking...${NC}"
    log ""
fi

# Run npm test and capture both stdout and stderr
log "${BOLD}${CYAN}Running: npm run test${NC}"
if [ "$total_tests" -gt 0 ]; then
    log "${BOLD}${MAGENTA}Total test files: $total_tests${NC}"
fi
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log ""

# Start timer
start_time=$(date +%s)

# Create named pipe for real-time output processing
PIPE="/tmp/npm_test_pipe_$$"
mkfifo "$PIPE"

# Create temporary file for sharing test counts between processes
TEMP_COUNTS="/tmp/npm_test_counts_$$"
echo "completed=0" > "$TEMP_COUNTS"
echo "passed=0" >> "$TEMP_COUNTS"
echo "failed=0" >> "$TEMP_COUNTS"
echo "skipped=0" >> "$TEMP_COUNTS"

# Run npm test in background, redirecting to pipe
npm run test 2>&1 | tee "$PIPE" >> "$LOG_FILE" &
NPM_PID=$!

# Progress tracking variables
completed=0
passed=0
failed=0
skipped=0

# Process output in real-time
while IFS= read -r line; do
    echo "$line"

    # Track test completion - match Jest's output format
    if echo "$line" | grep -qE "^\s*(PASS|FAIL)\s+.*\.test\.(mjs|js|ts|tsx)"; then
        ((completed++))

        if echo "$line" | grep -qE "^\s*PASS\s+"; then
            ((passed++))
        elif echo "$line" | grep -qE "^\s*FAIL\s+"; then
            ((failed++))
        fi

        # Calculate percentage
        if [ "$total_tests" -gt 0 ]; then
            percentage=$((completed * 100 / total_tests))
            progress_msg="${BOLD}${CYAN}Progress: ($completed/$total_tests) ${percentage}% | ${GREEN}Passed: $passed${NC} ${RED}Failed: $failed${NC}"

            echo -e "$progress_msg" | tee -a "$PROGRESS_LOG"
        fi
    fi

    # Track skipped tests
    if echo "$line" | grep -q "SKIP"; then
        ((skipped++))
    fi

    # Parse Jest summary line to detect failures
    # Example: "Tests:       21 failed, 16 passed, 37 total"
    if echo "$line" | grep -qE "^Tests:.*failed"; then
        failed_count=$(echo "$line" | sed -n 's/.*Tests:.*\([0-9]\+\) failed.*/\1/p')
        if [ -n "$failed_count" ] && [ "$failed_count" -gt 0 ]; then
            failed=$failed_count
            # Update shared temp file
            sed -i '' "s/^failed=.*/failed=$failed_count/" "$TEMP_COUNTS"
        fi
    fi
done < "$PIPE" &
READER_PID=$!

# Wait for npm test to complete
wait $NPM_PID
exit_code=$?

# Wait for reader to finish
wait $READER_PID

# Read final counts from shared temp file
if [ -f "$TEMP_COUNTS" ]; then
    source "$TEMP_COUNTS"
fi

# Clean up pipe and temp file
rm -f "$PIPE"
rm -f "$TEMP_COUNTS"

# End timer
end_time=$(date +%s)
duration=$((end_time - start_time))

# Read full output for error extraction
test_output=$(cat "$LOG_FILE")

# Parse Jest's final summary line to get accurate failure count
# Example: "Tests:       21 failed, 16 passed, 37 total"
jest_summary=$(grep -E "^Tests:.*total" "$LOG_FILE" | tail -1)
if [ -n "$jest_summary" ]; then
    # Extract failed count if present
    failed_from_summary=$(echo "$jest_summary" | grep -oE '[0-9]+ failed' | grep -oE '[0-9]+')
    if [ -n "$failed_from_summary" ]; then
        failed=$failed_from_summary
    fi

    # Extract passed count
    passed_from_summary=$(echo "$jest_summary" | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+')
    if [ -n "$passed_from_summary" ]; then
        passed=$passed_from_summary
    fi

    # Extract total count
    total_from_summary=$(echo "$jest_summary" | grep -oE '[0-9]+ total' | grep -oE '[0-9]+')
    if [ -n "$total_from_summary" ]; then
        completed=$total_from_summary
    fi
fi

# Check for failures even if exit code is 0 (npm might not propagate it correctly)
has_failures=false
if [ $exit_code -ne 0 ] || [ $failed -gt 0 ]; then
    has_failures=true
fi

# Extract and log errors separately
if [ "$has_failures" = true ]; then
    log ""
    log "${RED}━━━━━━━━━━━━━━━━━━━━━━ ERRORS DETECTED ━━━━━━━━━━━━━━━━━━━━━━${NC}"

    # Save errors to separate error log
    echo "=== NPM Test Errors - $TIMESTAMP ===" > "$ERROR_LOG_FILE"
    echo "" >> "$ERROR_LOG_FILE"
    echo "Exit code: $exit_code" >> "$ERROR_LOG_FILE"
    echo "Completed: $completed/$total_tests" >> "$ERROR_LOG_FILE"
    echo "Passed: $passed | Failed: $failed | Skipped: $skipped" >> "$ERROR_LOG_FILE"
    echo "" >> "$ERROR_LOG_FILE"

    # Extract failed test details
    grep -E "●|FAIL|expect\(|Error:|TypeError:|at Object\.|at " "$LOG_FILE" >> "$ERROR_LOG_FILE" 2>/dev/null

    # Display error summary
    log "${RED}Test run failed - Exit code: $exit_code | Failed tests: $failed${NC}"
    log ""

    # Extract meaningful error messages - show actual test failures
    error_summary=$(grep -B 2 -A 10 "●" "$LOG_FILE" | head -100)
    if [ -n "$error_summary" ]; then
        log "${RED}Failed Tests:${NC}"
        log "$error_summary"
    fi

    log ""
    log "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
fi

# Summary
log ""
log "${BOLD}${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
log "${BOLD}${BLUE}║                       SUMMARY REPORT                           ║${NC}"
log "${BOLD}${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
log ""
log "${BOLD}Completed at:${NC} $(date)"
log "${BOLD}Duration:${NC} ${duration}s"
log "${BOLD}Exit code:${NC} $exit_code"
log ""

# Test statistics
if [ "$total_tests" -gt 0 ]; then
    percentage=$((completed * 100 / total_tests))
    log "${BOLD}Test Statistics:${NC}"
    log "  Total test files: ${BOLD}$total_tests${NC}"
    log "  Completed:        ${BOLD}$completed ($percentage%)${NC}"
    log "  ${GREEN}Passed:${NC}           ${GREEN}${BOLD}$passed${NC}"
    log "  ${RED}Failed:${NC}           ${RED}${BOLD}$failed${NC}"
    if [ "$skipped" -gt 0 ]; then
        log "  ${YELLOW}Skipped:${NC}          ${YELLOW}${BOLD}$skipped${NC}"
    fi
    log ""
fi

if [ "$has_failures" = false ]; then
    log "${GREEN}${BOLD}✓ Tests passed successfully!${NC}"
    log ""
    log "${BOLD}${CYAN}Log Files Created:${NC}"
    log "  ${CYAN}Full Test Output:${NC}"
    log "    ${LOG_FILE}"
    log "    $(wc -l < "$LOG_FILE" | tr -d ' ') lines | $(du -h "$LOG_FILE" | cut -f1) size"
    log ""
    log "  ${CYAN}Progress Tracking:${NC}"
    log "    ${PROGRESS_LOG}"
    log "    $(wc -l < "$PROGRESS_LOG" | tr -d ' ') lines | $(du -h "$PROGRESS_LOG" | cut -f1) size"
    log ""
    exit 0
else
    log "${RED}${BOLD}✗ Tests failed!${NC}"
    log ""
    log "${BOLD}${CYAN}Log Files Created:${NC}"
    log "  ${CYAN}Full Test Output:${NC}"
    log "    ${LOG_FILE}"
    log "    $(wc -l < "$LOG_FILE" | tr -d ' ') lines | $(du -h "$LOG_FILE" | cut -f1) size"
    log ""
    log "  ${RED}Error Details:${NC}"
    log "    ${ERROR_LOG_FILE}"
    log "    $(wc -l < "$ERROR_LOG_FILE" | tr -d ' ') lines | $(du -h "$ERROR_LOG_FILE" | cut -f1) size"
    log "    Contains: Failed test details, stack traces, and error messages"
    log ""
    log "  ${CYAN}Progress Tracking:${NC}"
    log "    ${PROGRESS_LOG}"
    log "    $(wc -l < "$PROGRESS_LOG" | tr -d ' ') lines | $(du -h "$PROGRESS_LOG" | cut -f1) size"
    log ""
    log "${YELLOW}TIP: View errors with:${NC}"
    log "  ${BOLD}cat $ERROR_LOG_FILE${NC}"
    log "  ${BOLD}grep '●' $LOG_FILE${NC}  # Show failed test names"
    log ""
    exit 1
fi
