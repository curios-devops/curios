"use strict";

// netlify/functions/hello-world.js
exports.handler = async (event, context) => {
  console.log("\u{1F31F} Hello World function called!");
  console.log("\u{1F4CA} Event method:", event.httpMethod);
  console.log("\u{1F4CA} Event path:", event.path);
  console.log("\u{1F4CA} Query params:", event.queryStringParameters);
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json"
  };
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers
    };
  }
  const response = {
    message: "Hello World from Netlify!",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    method: event.httpMethod,
    success: true,
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      envVarCount: Object.keys(process.env).length
    }
  };
  console.log("\u2705 Sending response:", JSON.stringify(response, null, 2));
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(response)
  };
};
//# sourceMappingURL=hello-world.js.map
