import React from 'react';
import { env } from '../../config/env';

// Debug component to check environment variable access
export const EnvDebug: React.FC = () => {
  const openaiConfig = {
    hasApiKey: !!env.openai.apiKey,
    apiKeyLength: env.openai.apiKey?.length || 0,
    hasOrgId: !!env.openai.orgId,
    hasProjectId: !!env.openai.projectId,
    apiKeyPreview: env.openai.apiKey?.substring(0, 7) + '...' || 'missing'
  };

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg text-xs font-mono max-w-sm">
      <h3 className="font-bold mb-2">Environment Debug</h3>
      <div className="space-y-1">
        <div>API Key: {openaiConfig.hasApiKey ? '✅' : '❌'} ({openaiConfig.apiKeyLength} chars)</div>
        <div>Preview: {openaiConfig.apiKeyPreview}</div>
        <div>Org ID: {openaiConfig.hasOrgId ? '✅' : '❌'}</div>
        <div>Project ID: {openaiConfig.hasProjectId ? '✅' : '❌'}</div>
      </div>
    </div>
  );
};
