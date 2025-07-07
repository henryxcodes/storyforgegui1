#!/bin/bash

# 🚀 StoryForge GUI - Vercel Deployment Script
# This script automates the deployment process with proper checks

echo "🚀 StoryForge GUI - Vercel Deployment"
echo "======================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    print_error "Vercel CLI is not installed"
    print_info "Installing Vercel CLI globally..."
    npm install -g vercel
    if [ $? -ne 0 ]; then
        print_error "Failed to install Vercel CLI"
        exit 1
    fi
    print_status "Vercel CLI installed successfully"
fi

# Check if user is logged in to Vercel
if ! vercel whoami &> /dev/null; then
    print_warning "Not logged in to Vercel"
    print_info "Please log in to Vercel..."
    vercel login
    if [ $? -ne 0 ]; then
        print_error "Failed to log in to Vercel"
        exit 1
    fi
    print_status "Logged in to Vercel successfully"
fi

# Run pre-deployment checks
echo ""
echo "🔍 Running pre-deployment checks..."

# Check if npm install has been run
if [ ! -d "node_modules" ]; then
    print_warning "node_modules not found, running npm install..."
    npm install
    if [ $? -ne 0 ]; then
        print_error "npm install failed"
        exit 1
    fi
    print_status "Dependencies installed"
fi

# Check if TypeScript builds successfully
print_info "Testing TypeScript build..."
npm run build
if [ $? -ne 0 ]; then
    print_error "TypeScript build failed. Please fix compilation errors before deploying."
    exit 1
fi
print_status "TypeScript build successful"

# Check if required files exist
required_files=("vercel.json" "package.json" "tsconfig.json" "public/index.html" "server.ts")
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        print_error "Required file missing: $file"
        exit 1
    fi
done
print_status "All required files present"

# Check if API directory exists (for serverless functions)
if [ ! -d "api" ]; then
    print_warning "API directory not found, but deployment will continue"
else
    print_status "API directory found"
fi

print_status "All pre-deployment checks passed!"

# Ask user about deployment type
echo ""
echo "🎯 Deployment Options:"
echo "1) Preview deployment (for testing)"
echo "2) Production deployment"
echo "3) Cancel"

read -p "Select deployment type (1-3): " choice

case $choice in
    1)
        print_info "Starting preview deployment..."
        vercel
        ;;
    2)
        print_info "Starting production deployment..."
        echo ""
        print_warning "This will deploy to your production domain!"
        read -p "Are you sure you want to continue? (y/N): " confirm
        if [[ $confirm =~ ^[Yy]$ ]]; then
            vercel --prod
        else
            print_info "Production deployment cancelled"
            exit 0
        fi
        ;;
    3)
        print_info "Deployment cancelled"
        exit 0
        ;;
    *)
        print_error "Invalid choice"
        exit 1
        ;;
esac

# Check deployment result
if [ $? -eq 0 ]; then
    echo ""
    print_status "Deployment completed successfully! 🎉"
    echo ""
    print_info "Next steps:"
    echo "1. Test your deployment URL"
    echo "2. Set up environment variables in Vercel dashboard if not done already"
    echo "3. Create Vercel KV storage for story persistence"
    echo "4. Set up automatic cleanup cron job (optional)"
    echo ""
    print_info "Environment variables needed:"
    echo "- ANTHROPIC_API_KEY (optional - fallback exists)"
    echo "- ELEVENLABS_API_KEY (optional - fallback exists)"  
    echo "- FISH_API_KEY (optional - fallback exists)"
    echo "- NODE_ENV=production"
    echo "- CLEANUP_API_KEY (generate a secure random key)"
    echo ""
    print_info "Vercel KV variables (auto-added when you create KV storage):"
    echo "- KV_URL"
    echo "- KV_REST_API_URL" 
    echo "- KV_REST_API_TOKEN"
    echo "- KV_REST_API_READ_ONLY_TOKEN"
    echo ""
    print_status "Refer to DEPLOYMENT_CHECKLIST.md for detailed setup instructions"
else
    print_error "Deployment failed"
    echo ""
    print_info "Troubleshooting tips:"
    echo "1. Check your internet connection"
    echo "2. Verify Vercel CLI is working: vercel whoami"
    echo "3. Check build logs for errors"
    echo "4. Ensure all files are committed (if using Git integration)"
    exit 1
fi 