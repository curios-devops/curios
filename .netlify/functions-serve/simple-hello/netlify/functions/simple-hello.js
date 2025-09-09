"use strict";

// netlify/functions/simple-hello.js
exports.handler = async (event, context) => {
  console.log("\u{1F3AF} Simple hello function called!");
  console.log("Method:", event.httpMethod);
  console.log("Path:", event.path);
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/plain",
      "Access-Control-Allow-Origin": "*"
    },
    body: "Hello from simple function!"
  };
};
//# sourceMappingURL=simple-hello.js.map
