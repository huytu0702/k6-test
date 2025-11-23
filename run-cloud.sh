#!/bin/bash
# K6 Cloud Test Runner
# This script sets up environment and runs K6 tests with cloud output

echo "========================================"
echo "K6 CLOUD TEST RUNNER"
echo "========================================"
echo

# Set K6 Cloud token (add your token here)
# export K6_CLOUD_TOKEN="your_token_here"
# export K6_CLOUD_HOST="https://app.k6.io"

if [ -z "$1" ]; then
    echo "Usage: ./run-cloud.sh [test-script] [mode]"
    echo
    echo "Modes:"
    echo "  stream  - Stream results to cloud (free, runs locally)"
    echo "  cloud   - Execute on cloud infrastructure (uses VUh)"
    echo
    echo "Examples:"
    echo "  ./run-cloud.sh scripts/load-test-cloud.js stream"
    echo "  ./run-cloud.sh scripts/load-test-cloud.js cloud"
    exit 1
fi

if [ "$2" = "cloud" ]; then
    echo "Running test on K6 Cloud infrastructure..."
    echo "This will use VUh from your quota"
    echo
    k6 cloud "$1"
else
    echo "Streaming results to K6 Cloud..."
    echo "Test runs locally (no VUh used)"
    echo
    k6 run --out cloud "$1"
fi

echo
echo "========================================"
echo "Test completed!"
echo "View results at: https://app.k6.io"
echo "========================================"
