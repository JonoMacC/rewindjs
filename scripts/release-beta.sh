#!/bin/bash

set -e

echo "🚦 Releasing beta version..."

# Step 1: Ensure working directory is clean
if [[ -n $(git status --porcelain) ]]; then
  echo "❌ Git working directory not clean. Please commit or stash your changes."
  exit 1
fi

# Step 2: Bump beta version
npm version prerelease --preid=beta

# Capture new version
VERSION=$(node -p "require('./package.json').version")

echo "📦 Publishing version $VERSION to npm with tag 'beta'..."
npm publish --tag beta

# Step 3: Promote to latest
echo "🔗 Promoting $VERSION to 'latest'..."
npm dist-tag add rewind-js@$VERSION latest

# Step 4: Push to GitHub
echo "🚀 Pushing commit and tag to GitHub..."
git push
git push --tags

echo "✅ Beta release $VERSION published and pushed."
