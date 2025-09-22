Supabase MCP Server
by Sentry01
Databases
Developer Tools
Search
JavaScript
Need Help?
View Source Code
Report Issue

Which integrations are available for this server?
Supabase MCP Server Implementation Plan
This document outlines the plan for creating a Model Context Protocol (MCP) server that connects to Supabase, allowing AI assistants like GitHub Copilot to interact with your Supabase database.

Table of Contents
Overview

Prerequisites

Implementation Steps

Server Architecture

Configuration

Security Considerations

Installation Guide

Usage Examples

Troubleshooting

Overview
The Supabase MCP server will act as a bridge between AI assistants (like GitHub Copilot) and your Supabase database. This allows the AI to:

Understand your database schema

Know about tables and relationships

Assist with query writing

Provide context-aware suggestions related to your data model

Prerequisites
Node.js 18+ installed

npm or yarn package manager

Supabase project with admin API key

VS Code with Copilot/MCP support

Git

Implementation Steps
1. Create Server Package
mkdir mcp-server-supabase
cd mcp-server-supabase
npm init -y

2. Install Dependencies
npm install @supabase/supabase-js @modelcontextprotocol/server dotenv

3. Basic Server Structure
Create these files:

src/index.js - Main entry point

src/supabase-client.js - Supabase connection handling

src/schema-provider.js - Database schema extraction

src/query-handler.js - Safe query execution

.env.example - Environment variable template

config.js - Configuration management

4. Server Implementation Details
src/index.js
This file will initialize the MCP server and connect the components:

const { MCPServer } = require('@modelcontextprotocol/server');
const { getSupabaseClient } = require('./supabase-client');
const { SchemaProvider } = require('./schema-provider');
const { QueryHandler } = require('./query-handler');
const config = require('./config');

async function main() {
  try {
    // Initialize Supabase client
    const supabaseClient = getSupabaseClient(config.supabase.url, config.supabase.key);
    
    // Create providers
    const schemaProvider = new SchemaProvider(supabaseClient);
    const queryHandler = new QueryHandler(supabaseClient, config.security.allowedQueries);
    
    // Initialize MCP server
    const server = new MCPServer({
      name: 'mcp-server-supabase',
      version: '1.0.0',
    });
    
    // Register handlers
    server.registerHandler('getSchema', async () => {
      return await schemaProvider.getFullSchema();
    });
    
    server.registerHandler('getTableInfo', async (params) => {
      return await schemaProvider.getTableInfo(params.tableName);
    });
    
    server.registerHandler('executeQuery', async (params) => {
      return await queryHandler.execute(params.query, params.params);
    });
    
    // Start the server
    await server.start();
    console.log('MCP Supabase server is running');
  } catch (error) {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

main();

src/supabase-client.js
const { createClient } = require('@supabase/supabase-js');

function getSupabaseClient(url, apiKey) {
  if (!url || !apiKey) {
    throw new Error('Supabase URL and API key must be provided');
  }
  
  return createClient(url, apiKey, {
    auth: { persistSession: false },
  });
}

module.exports = { getSupabaseClient };

src/schema-provider.js
class SchemaProvider {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
  }
  
  async getFullSchema() {
    // Query Supabase for full database schema
    const { data, error } = await this.supabase
      .rpc('get_schema_information', {});
    
    if (error) throw new Error(`Failed to get schema: ${error.message}`);
    
    return data;
  }
  
  async getTableInfo(tableName) {
    // Get detailed information about a specific table
    const { data, error } = await this.supabase
      .rpc('get_table_information', { table_name: tableName });
    
    if (error) throw new Error(`Failed to get table info: ${error.message}`);
    
    return data;
  }
}

module.exports = { SchemaProvider };

src/query-handler.js
class QueryHandler {
  constructor(supabaseClient, allowedQueryTypes = ['SELECT']) {
    this.supabase = supabaseClient;
    this.allowedQueryTypes = allowedQueryTypes; 
  }
  
  validateQuery(queryString) {
    // Basic SQL injection prevention and query type validation
    const normalizedQuery = queryString.trim().toUpperCase();
    
    // Check if the query starts with allowed query types
    const isAllowed = this.allowedQueryTypes.some(
      type => normalizedQuery.startsWith(type)
    );
    
    if (!isAllowed) {
      throw new Error(`Query type not allowed. Allowed types: ${this.allowedQueryTypes.join(', ')}`);
    }
    
    return true;
  }
  
  async execute(queryString, params = {}) {
    // Validate query before execution
    this.validateQuery(queryString);
    
    // Execute the query through Supabase
    const { data, error } = await this.supabase
      .rpc('execute_query', { query_string: queryString, query_params: params });
    
    if (error) throw new Error(`Query execution failed: ${error.message}`);
    
    return data;
  }
}

module.exports = { QueryHandler };

config.js
require('dotenv').config();

module.exports = {
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_KEY,
  },
  server: {
    port: process.env.PORT || 3000,
  },
  security: {
    allowedQueries: process.env.ALLOWED_QUERY_TYPES 
      ? process.env.ALLOWED_QUERY_TYPES.split(',') 
      : ['SELECT'],
  }
};

.env.example
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
PORT=3000
ALLOWED_QUERY_TYPES=SELECT

5. Supabase Database Functions
You'll need to create these stored procedures in Supabase:

get_schema_information() - Returns database schema

get_table_information(table_name TEXT) - Returns info about specific table

execute_query(query_string TEXT, query_params JSONB) - Safely executes queries

Server Architecture
┌─────────────────────┐      ┌───────────────────┐
│                     │      │                   │
│  VS Code + Copilot  │◄────►│   MCP Protocol    │
│                     │      │                   │
└─────────────────────┘      └─────────┬─────────┘
                                      │
                                      ▼
                            ┌─────────────────────┐
                            │                     │
                            │ Supabase MCP Server │
                            │                     │
                            └─────────┬───────────┘
                                      │
                                      ▼
                            ┌─────────────────────┐
                            │                     │
                            │  Supabase Database  │
                            │                     │
                            └─────────────────────┘

Configuration
Add the Supabase MCP server to your VS Code settings.json:

"mcp": {
  "inputs": [],
  "servers": {
    // ...existing servers...
    "mcp-server-supabase": {
      "command": "node",
      "args": [
        "/path/to/mcp-server-supabase/src/index.js"
      ],
      "env": {
        "SUPABASE_URL": "https://your-project-ref.supabase.co",
        "SUPABASE_SERVICE_KEY": "your-service-key",
        "ALLOWED_QUERY_TYPES": "SELECT"
      }
    }
  }
}

Security Considerations
API Key Management:

Use a scoped API key with minimum required permissions

Store API keys securely, never commit to version control

Consider using a key rotation strategy

Query Restrictions:

Default to SELECT-only for safety

Consider implementing a query allowlist approach

Add rate limiting to prevent abuse

Data Protection:

Avoid exposing PII or sensitive data

Implement row-level security in Supabase

Consider adding data masking for sensitive fields

Installation Guide
Local Development
Clone the repository

git clone https://github.com/yourusername/mcp-server-supabase.git
cd mcp-server-supabase

Install dependencies

npm install

Create .env file from example

cp .env.example .env

Edit .env with your Supabase credentials

Start the server

node src/index.js

VS Code Integration
Update your VS Code settings.json with the server configuration

Restart VS Code

Verify the server is running in the VS Code MCP panel

Usage Examples
Once integrated, you can use the Supabase MCP server in various ways:

Schema exploration:

What tables do I have in my Supabase database?

Table information:

What columns are in the users table?

Query assistance:

Help me write a query to get all users who signed up in the last 7 days

Troubleshooting
Server won't start

Check your Node.js version (should be 18+)

Verify your Supabase credentials

Check for error logs in the terminal

Schema not loading

Verify your Supabase service key has necessary permissions

Check that the database functions are properly created

VS Code can't connect

Check that the server path in settings.json is correct

Restart VS Code after configuration changes

Verify the server process is running