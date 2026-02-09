#!/bin/bash

# Setup Labels Script
# Creates all required labels for Kimi GitHub Agent error handling and recovery

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Usage information
usage() {
  echo "Usage: $0 <owner/repo>"
  echo ""
  echo "Example: $0 drbobber/Kimi-github-agent"
  echo ""
  echo "Environment: Requires GITHUB_TOKEN to be set"
  exit 1
}

# Check arguments
if [ $# -ne 1 ]; then
  usage
fi

REPO=$1

# Check for GitHub CLI or GITHUB_TOKEN
if ! command -v gh &> /dev/null; then
  if [ -z "$GITHUB_TOKEN" ]; then
    echo -e "${RED}Error: Neither 'gh' CLI nor GITHUB_TOKEN environment variable found${NC}"
    echo "Please install GitHub CLI or set GITHUB_TOKEN"
    exit 1
  fi
  USE_API=true
else
  USE_API=false
fi

echo -e "${BLUE}🏷️  Setting up labels for ${REPO}...${NC}\n"

# Function to create label using GitHub CLI
create_label_gh() {
  local name=$1
  local color=$2
  local description=$3
  
  if gh label list -R "$REPO" | grep -q "^${name}"; then
    echo -e "${YELLOW}⏭️  Label '${name}' already exists${NC}"
  else
    gh label create "$name" --color "$color" --description "$description" -R "$REPO" 2>/dev/null
    echo -e "${GREEN}✅ Created label '${name}'${NC}"
  fi
}

# Function to create label using API
create_label_api() {
  local name=$1
  local color=$2
  local description=$3
  
  # Check if label exists
  response=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github+json" \
    "https://api.github.com/repos/${REPO}/labels/${name}")
  
  if [ "$response" = "200" ]; then
    echo -e "${YELLOW}⏭️  Label '${name}' already exists${NC}"
  else
    curl -s -X POST \
      -H "Authorization: Bearer $GITHUB_TOKEN" \
      -H "Accept: application/vnd.github+json" \
      "https://api.github.com/repos/${REPO}/labels" \
      -d "{\"name\":\"${name}\",\"color\":\"${color}\",\"description\":\"${description}\"}" > /dev/null
    echo -e "${GREEN}✅ Created label '${name}'${NC}"
  fi
}

# Wrapper function to create label
create_label() {
  if [ "$USE_API" = true ]; then
    create_label_api "$@"
  else
    create_label_gh "$@"
  fi
}

echo -e "${BLUE}📊 Status Labels${NC}"
create_label "kimi-ready" "28a745" "Ready for Kimi agent to process"
create_label "kimi-working" "0366d6" "Kimi agent is currently working on this"
create_label "in-progress" "fbca04" "Work is in progress"
create_label "pr-created" "8b5cf6" "Pull request has been created"
create_label "kimi-failed" "d73a4a" "Kimi agent failed to process this task"
create_label "kimi-recovered" "ff9800" "Recovered from stuck state"
create_label "needs-human-review" "b60205" "Requires human intervention"
create_label "kimi-implemented" "0e8a16" "Successfully implemented by Kimi agent"

echo -e "\n${BLUE}🚨 Error Type Labels${NC}"
create_label "error-quota_exceeded" "d73a4a" "Task failed due to quota/token limits"
create_label "error-context_overflow" "d73a4a" "Task failed due to context window overflow"
create_label "error-network_error" "d73a4a" "Task failed due to network issues"
create_label "error-timeout" "d73a4a" "Task failed due to timeout"
create_label "error-git_conflict" "d73a4a" "Task failed due to git conflicts"
create_label "error-unknown" "d73a4a" "Task failed with unknown error"

echo -e "\n${BLUE}🔄 Retry Labels${NC}"
create_label "retry-1" "ff6b6b" "First retry attempt"
create_label "retry-2" "ff8c42" "Second retry attempt"
create_label "retry-3" "ffd93d" "Third retry attempt - needs review after this"

echo -e "\n${GREEN}✅ All labels created successfully!${NC}"
