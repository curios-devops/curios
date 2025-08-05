#!/bin/bash

# 🚀 CuriosAI Enhanced LinkedIn Sharing - Production Copy Script
# Run this in your curiosai.com project directory

echo "🎯 Copying CuriosAI LinkedIn Sharing enhancements to production..."

# Create directories if they don't exist
mkdir -p src/components/results
mkdir -p netlify/edge-functions
mkdir -p netlify/functions
mkdir -p public

echo "📁 Created directory structure"

# Copy LoadingState theme fix
echo "✅ Copying LoadingState theme fix..."
cat > src/components/results/LoadingState.tsx << 'EOF'
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message: string;
}

export default function LoadingState({ message }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111111] transition-colors duration-200">
      <Loader2 className="animate-spin text-[#0095FF] mb-4" size={28} />
      <p className="text-gray-700 dark:text-gray-400 text-sm transition-colors duration-200">{message}</p>
      <p className="text-xs text-gray-600 dark:text-gray-500 mt-2 transition-colors duration-200">This might take a few moments</p>
    </div>
  );
}
EOF

echo "✅ LoadingState.tsx updated with theme responsiveness"

# Instructions for manual file copying
echo ""
echo "📋 MANUAL STEPS REQUIRED:"
echo "1. Copy your enhanced ShareMenu.tsx from development to production"
echo "2. Copy your enhanced social-meta.ts edge function"
echo "3. Copy your enhanced og-image.ts function"
echo ""
echo "These files contain your specific configurations and should be copied manually."
echo ""
echo "🔗 Test URLs after deployment:"
echo "- LinkedIn Post Inspector: https://www.linkedin.com/post-inspector/"
echo "- Test: https://your-domain.com/search?q=artificial+intelligence"
echo ""
echo "🎉 Ready to deploy enhanced LinkedIn sharing with AI snippet teasers!"
