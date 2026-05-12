#!/usr/bin/env node

/**
 * Test script to verify Anam WebSocket connection
 * Run: node scripts/test-anam-websocket.js
 */

const SUPABASE_URL = 'https://gpfccicfqynahflehpqo.supabase.co';

async function testAnamWebSocket() {
  console.log('🎭 Testing Anam WebSocket Connection\n');

  try {
    // Step 1: Get API key from Supabase
    console.log('📡 Step 1: Getting API key from Supabase...');
    const response = await fetch(`${SUPABASE_URL}/functions/v1/get-anam-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      throw new Error(`Failed to get API key: ${response.status}`);
    }

    const { apiKey, wsUrl } = await response.json();
    console.log(`✅ API key received: ${apiKey.substring(0, 20)}...`);
    console.log(`📍 WebSocket URL: ${wsUrl}\n`);

    // Step 2: Connect to WebSocket (using ws library for Node.js)
    console.log('🔌 Step 2: Attempting WebSocket connection...');
    const WebSocket = (await import('ws')).default;

    const wsUrlWithKey = `${wsUrl}?api_key=${encodeURIComponent(apiKey)}`;
    console.log(`🔗 Connecting to: ${wsUrl}?api_key=***\n`);

    const ws = new WebSocket(wsUrlWithKey);

    ws.on('open', () => {
      console.log('✅ WebSocket connected successfully!\n');

      // Step 3: Try to send a test message
      console.log('📤 Step 3: Sending test message...');
      const testMessage = {
        type: 'test',
        message: 'Hello from CuriosAI'
      };
      ws.send(JSON.stringify(testMessage));
      console.log('📨 Sent:', JSON.stringify(testMessage, null, 2));
    });

    ws.on('message', (data) => {
      console.log('\n📨 Message received from Anam:');

      // Check if it's binary data (video frame)
      if (Buffer.isBuffer(data)) {
        console.log(`📹 Binary data (video frame?): ${data.length} bytes`);
      } else {
        // Try to parse as JSON
        try {
          const parsed = JSON.parse(data.toString());
          console.log('📋 JSON message:', JSON.stringify(parsed, null, 2));
        } catch {
          console.log('📋 Text message:', data.toString());
        }
      }
    });

    ws.on('error', (error) => {
      console.error('\n❌ WebSocket error:', error.message);
    });

    ws.on('close', (code, reason) => {
      console.log(`\n🔌 WebSocket closed`);
      console.log(`   Code: ${code}`);
      console.log(`   Reason: ${reason || 'none'}`);
      process.exit(0);
    });

    // Keep alive for 30 seconds to observe messages
    setTimeout(() => {
      console.log('\n⏱️  30 seconds elapsed, closing connection...');
      ws.close();
    }, 30000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testAnamWebSocket();
