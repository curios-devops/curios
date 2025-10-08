## Testing Supabase Edge Functions with HTML

You can use the HTML test page at `http://localhost:5173/supabase/test-openai-key.html` 

http://localhost:5173/test 
(or the correct dev server URL) to verify your Supabase edge functions from the browser.

### Steps:
1. Open `supabase/test-openai-key.html` in your browser.
2. Make sure you have set the correct Supabase anon key in the script:
  - Use the value of `SUPABASE_ANON_KEY` from your `.env` file (not the VITE_ version).
  - Example:
    ```js
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
    ```
3. The page has two buttons:
  - **Test OPENAI_API_KEY**: Checks if your edge function can access the OpenAI key.
  - **Test OpenAI Call**: Sends a prompt to your OpenAI edge function and displays the response.
4. Both buttons use the full Supabase URL and send the anon key in the Authorization header.

### Troubleshooting
- If you see authorization errors, double-check the anon key and that it matches your Supabase project.
- If you see 404 errors, make sure the edge function is deployed and the name matches the route.
- If you see HTML responses, update the fetch URL to use the full Supabase URL, not a local path.

This page is useful for quick browser-based verification of your Supabase edge functions.
## HISTORY VERSION
**2024**
  11.15 - Add Sources Format
  11.28 - Update Port 5173 and som UI updates in MainContent.tsx 
  11.29 - Update Home Botton and UI in MainContent.tsx 
  11.30 - Add Keys for Mongo to handle users
  12.01 - Add SignUp
  12.31 - Add Logic for Guess-Users
**2025**
  01.01 - Add focus mode UI 
  01.18 - Add Brave Search
  01.31 - Add RapidAPI searxNG
  02.05 - Simplified to only Brave Search
  02.20 - Added Rapid API
  02.22 - Replace Brave for Tavily
  02.23 - Add Stripe
  03.24 - Add Share after adding Pro Search (fix Stripe update)
  07.01 - Ad Researcher
  07.06 - Ad Artifacts
  07.25 - Ad Three selector, and Homepage UI updates
  09.15 - New structure by service not artifact
  09.15 - Refactor search flow: Simplify and add comprehensive console logging
  09.16 - Refactor citations: Small compact blue buttons with white text, clickable links
  09.19 - Refactor chat completions. and delete keys
  09.23 - finsih refactot Locally working.
  09.26 - netfily backend deleted
  09.28 - brave call migrated to backend
  10.07 - Brave working local
  
# CURIOSAI  Runing Dev
1. npm run dev

2. if you have a problem with the port 8888
  > lsof -ti:8888 | xargs kill -9
  verify the port is free and start the development server:
   > lsof -i :8888
3. IS front end port 5173 is in use then use 
   > lsof -ti:5173 | xargs kill -9

# CuriosAI  Deploy on Internet

**To Update and deploy Project:**

1. Backup (just in case, optional)
   Open Curios folder 
   > rsync -av --exclude='.git' ../Curios-x-x/ ./
     (Replace x-x for the new folder name) 

2. Commit and push to update your GitHub repo:
   > git add .
   > git commit -m "Merge updates from Curios-x-x"
   > git push

3. Validate git hub and in netlify
   Trigger a Deploy and wait for Site is live 

    To validate:  Open http://wwww.curiosai.com 

   should be now live an running...

Good Luck!!!



## Deploying SUPABASE Edge Functions
Steps to Upload/Update Supabase Edge Functions
(Make Sure You're in the Right Directory)

1. Ensure your working directory is at the root of your Supabase project. It should look like this:

Curios/
  supabase/
    functions/
      stripe-webhook/
        index.ts
      social-share/
        index.ts
      social-og-image/
        index.ts
      social-share-search/
        index.ts
      fetch-openai/
        index.ts
2. Run the Deploy Commands (be sure Docker is Open):

 > supabase functions deploy stripe-webhook
 > supabase functions deploy social-share
 > supabase functions deploy social-og-image  
 > supabase functions deploy social-share-search
 > supabase functions deploy brave-web-search
 > supabase functions deploy brave-images-search
 > supabase functions deploy fetch-openai

3. Verify the Deployment After deploying, verify that the functions were successfully updated:
 > supabase functions list
You should see all functions listed: stripe-webhook, social-share, social-og-image, social-share-search, brave-web-search, brave-images-search, fetch-openai.

4. Check the Logs To ensure everything is working correctly:
> supabase functions logs fetch-openai
> supabase functions logs social-share

5. Test the Functions
Test each function to ensure they work correctly:
> curl https://your-project.supabase.co/functions/v1/fetch-openai
> curl https://your-project.supabase.co/functions/v1/social-share

To download the project From Firebase Studio run:
tar -czvf project.tar.gz --exclude=".*" .
then Righ click and Download


Restart your TypeScript server or IDE

In VS Code:

Open the Command Palette (Cmd+Shift+P on Mac).
Type and select: “TypeScript: Restart TS Server”.
Or simply reload the window (Cmd+Shift+P → “Developer: Reload Window”).



  found value at line 88 in dist/assets/services-search-DQEKmhOb.js
11:59:35 PM: Secret env var "VITE_SUPABASE_PUBLISHABLE_KEY"'s value detected:
  found value at line 88 in dist/assets/services-search-DQEKmhOb.js



Start unified development environment
npm run dev

# Stop Supabase server when done
npm run dev:stop

# Individual servers (if needed)
npm run vite:dev      # Vite only
npm run supabase:dev  # Supabase only