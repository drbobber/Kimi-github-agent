#!/bin/bash

# Setup GitHub labels for Kimi GitHub Agent
# Usage: ./scripts/setup-labels.sh owner/repo
# Or with token: GITHUB_TOKEN=ghp_xxx ./scripts/setup-labels.sh owner/repo

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 owner/repo"
  echo "Example: $0 drbobber/my-project"
  exit 1
fi

REPO="$1"

echo "🏷️  Setting up labels for $REPO..."
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
  echo "❌ GitHub CLI (gh) is not installed."
  echo "📦 Install it from: https://cli.github.com/"
  exit 1
fi

# Status labels
echo "Creating status labels..."
gh label create "kimi-ready" --color "0E8A16" --description "Ready for Kimi agent to process" --repo "$REPO" --force 2>/dev/null || true
gh label create "kimi-working" --color "1D76DB" --description "Kimi agent is currently working" --repo "$REPO" --force 2>/dev/null || true
gh label create "in-progress" --color "FBCA04" --description "Work in progress" --repo "$REPO" --force 2>/dev/null || true
gh label create "pr-created" --color "6F42C1" --description "PR has been created" --repo "$REPO" --force 2>/dev/null || true
gh label create "kimi-failed" --color "D93F0B" --description "Kimi agent failed" --repo "$REPO" --force 2>/dev/null || true
gh label create "kimi-recovered" --color "FFA500" --description "Recovered from stuck state" --repo "$REPO" --force 2>/dev/null || true
gh label create "needs-human-review" --color "B60205" --description "Requires human intervention" --repo "$REPO" --force 2>/dev/null || true
gh label create "kimi-implemented" --color "0E8A16" --description "Successfully implemented by Kimi" --repo "$REPO" --force 2>/dev/null || true

# Error type labels
echo "Creating error type labels..."
gh label create "error-quota_exceeded" --color "D93F0B" --description "API quota exceeded" --repo "$REPO" --force 2>/dev/null || true
gh label create "error-context_overflow" --color "D93F0B" --description "Context limit exceeded" --repo "$REPO" --force 2>/dev/null || true
gh label create "error-network_error" --color "D93F0B" --description "Network error" --repo "$REPO" --force 2>/dev/null || true
gh label create "error-timeout" --color "D93F0B" --description "Task timeout" --repo "$REPO" --force 2>/dev/null || true
gh label create "error-git_conflict" --color "D93F0B" --description "Git conflict" --repo "$REPO" --force 2>/dev/null || true
gh label create "error-unknown" --color "D93F0B" --description "Unknown error" --repo "$REPO" --force 2>/dev/null || true

# Retry labels
echo "Creating retry labels..."
gh label create "retry-1" --color "FFA500" --description "First retry attempt" --repo "$REPO" --force 2>/dev/null || true
gh label create "retry-2" --color "FF8C00" --description "Second retry attempt" --repo "$REPO" --force 2>/dev/null || true
gh label create "retry-3" --color "FF4500" --description "Third retry attempt (final)" --repo "$REPO" --force 2>/dev/null || true

echo ""
echo "✅ All labels created successfully for $REPO!"
echo ""
echo "📋 Summary:"
echo "   - 8 status labels"
echo "   - 6 error type labels"
echo "   - 3 retry labels"
echo ""
echo "💡 Tip: View all labels at: https://github.com/$REPO/labels"
