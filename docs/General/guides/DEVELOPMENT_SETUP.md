# 🚀 Unified Development Setup

## Quick Start

```bash
# Start both Supabase and Vite servers with one command
npm run dev

# Stop Supabase server
npm run dev:stop
```

## Development Commands

- `npm run dev` - Start both Supabase local server and Vite dev server
- `npm run vite:dev` - Start only Vite dev server (port 5173)
- `npm run supabase:dev` - Start only Supabase local server
- `npm run dev:stop` - Stop Supabase local server

## How It Works

The unified development setup runs both services concurrently:
- **Supabase** (blue prefix): Local Edge Functions and database
- **Vite** (green prefix): Frontend development server

Both servers start simultaneously, and you can see their logs color-coded in the terminal.
