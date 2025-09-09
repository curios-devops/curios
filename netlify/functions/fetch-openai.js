// Netlify function to proxy OpenAI Responses API with swarm architecture support
exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Use OPENAI_API_KEY (server-side environment variable)
    const apiKey = process.env.OPENAI_API_KEY;
    console.log('🔑 Debug: API key check - Length:', apiKey?.length, 'Starts with sk-:', apiKey?.startsWith('sk-'));
    if (!apiKey) {
      console.error('Missing OpenAI API key. Available env vars:', Object.keys(process.env).filter(k => k.includes('OPENAI')));
      throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY in Netlify environment variables.');
    }

    let requestBody;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (parseError) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }

    const { input, query, searchResults, model = 'gpt-4o-mini', ...rest } = requestBody;
    
    console.log('Received request for model:', model);
    console.log('Has input:', !!input);
    console.log('Has query:', !!query);
    console.log('Has searchResults:', !!searchResults);
    
    // Handle different input formats for swarm architecture integration
    let finalInput;
    
    if (query && searchResults) {
      // Swarm architecture: combine query with search results
      const searchContext = Array.isArray(searchResults) ? searchResults
        .slice(0, 5) // Limit to 5 results to control token usage
        .map((result, index) => `[${index + 1}] ${result.title}: ${result.content?.slice(0, 200)}...`)
        .join('\n\n') : '';
      
      finalInput = `Query: ${query}\n\nRelevant Search Results:\n${searchContext}\n\nPlease provide a comprehensive answer based on the search results above.`;
      
      // For Responses API, convert to message format for better compatibility
      if (model === 'gpt-5-mini' || model === 'gpt-4o-mini') {
        finalInput = [
          {"role": "system", "content": "You are a helpful AI assistant that provides comprehensive answers based on search results."},
          {"role": "user", "content": finalInput}
        ];
      }
      
      // Basic token estimation (4 chars ≈ 1 token) - Optimized for performance
      const contentToEstimate = Array.isArray(finalInput) 
        ? finalInput.map(msg => msg.content).join(' ')
        : finalInput;
      const estimatedTokens = contentToEstimate.length / 4;
      console.log('Estimated tokens:', estimatedTokens);
      
      // More aggressive truncation for better performance
      if (estimatedTokens > 2500) { // Reduced from 3000 to 2500
        // Truncate content if too long
        if (Array.isArray(finalInput)) {
          // For message arrays, truncate the user message content
          const userMsgIndex = finalInput.findIndex(msg => msg.role === 'user');
          if (userMsgIndex !== -1) {
            const maxChars = 2500 * 4; // ~2500 tokens
            finalInput[userMsgIndex].content = finalInput[userMsgIndex].content.slice(0, maxChars) + '...[truncated for performance]';
          }
        } else {
          // For string input
          const maxChars = 2500 * 4; // ~2500 tokens
          finalInput = finalInput.slice(0, maxChars) + '...[truncated for performance]';
        }
        console.log('Content truncated to improve processing speed');
      }
    } else if (input) {
      // Direct input format 
      if (model === 'gpt-5-mini' || model === 'gpt-4o-mini') {
        // Modern models expect array of messages
        if (typeof input === 'string') {
          finalInput = [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": input}
          ];
        } else if (Array.isArray(input)) {
          finalInput = input;
        } else {
          finalInput = [
            {"role": "user", "content": input.content || input.toString()}
          ];
        }
      } else {
        // Other models expect string input
        finalInput = typeof input === 'string' ? input : (input.content || input.toString());
      }
    } else {
      throw new Error('Either input or (query + searchResults) must be provided');
    }

    // Prepare OpenAI API request - simplified for compatibility
    const openAIRequestBody = {
      model: model,
      input: finalInput
    };

    // For gpt-5-mini, we need specific parameters to get output_text
    if (model === 'gpt-5-mini') {
      // Add text format specification (required for gpt-5-mini)
      openAIRequestBody.text = {
        format: { type: 'text' }
      };
      
      // Use optimized token limit for faster processing
      openAIRequestBody.max_output_tokens = Math.min(rest.max_completion_tokens || 500, 800);
    } else {
      // For other models, use standard parameters with optimization
      if (rest.max_completion_tokens) {
        // Use max_output_tokens for Responses API (same as gpt-5-mini)
        openAIRequestBody.max_output_tokens = Math.min(rest.max_completion_tokens || 1200, 1500); // Cap at 1500 for performance
      }
    }

    // Add reasoning configuration only for models that support it
    // Currently, reasoning is only supported by models like gpt-o1, not gpt-4o-mini
    if (rest.reasoning_effort && (model.includes('o1') || model.includes('gpt-5'))) {
      openAIRequestBody.reasoning = {
        effort: rest.reasoning_effort || 'medium'
      };
    }

    // Add temperature and top_p only for models that support them
    if (model !== 'gpt-5-mini') {
      if (rest.temperature !== undefined) {
        openAIRequestBody.temperature = rest.temperature;
      }
      if (rest.top_p !== undefined) {
        openAIRequestBody.top_p = rest.top_p;
      }
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };

    const orgId = process.env.OPENAI_ORG_ID;
    const projectId = process.env.OPENAI_PROJECT_ID;
    if (orgId) headers['OpenAI-Organization'] = orgId;
    if (projectId) headers['OpenAI-Project'] = projectId;

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers,
      body: JSON.stringify(openAIRequestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI Responses API error:', response.status, errorText);
      return {
        statusCode: response.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          error: `OpenAI API error: ${response.status}`,
          details: errorText
        })
      };
    }

    const data = await response.json();
    console.log('Successfully received response from OpenAI');
    
    // Extract output_text from the response structure
    let output_text = '';
    if (data.output && Array.isArray(data.output)) {
      // Find the first message with content
      const messageOutput = data.output.find(item => item.type === 'message' && item.content);
      if (messageOutput && messageOutput.content && Array.isArray(messageOutput.content)) {
        // Find the text content
        const textContent = messageOutput.content.find(content => content.type === 'output_text' && content.text);
        if (textContent) {
          output_text = textContent.text;
        }
      }
    }
    
    // Add the extracted output_text to the response for compatibility
    const enhancedData = {
      ...data,
      output_text: output_text
    };
    
    console.log('Extracted output_text length:', output_text.length);
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      body: JSON.stringify(enhancedData)
    };
  } catch (error) {
    console.error('OpenAI Responses proxy error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: error.message || 'OpenAI Responses proxy failed',
        timestamp: new Date().toISOString()
      })
    };
  }
};
