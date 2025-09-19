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
# CURIOSAI  Runing Dev
1. npm run dev

2. if you have a problem with the port 8888
  > sof -ti:8888 | xargs kill -9
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



## Deploying SUPABASE Edge Function
Steps to Upload/Update the Supabase Webhook Function
(Make Sure You’re in the Right Directory)

1. Ensure your working directory is at the root of your Supabase project. It should look like this:

Curios/
  supabase/
    functions/
      stripe-webhook/
        index.ts
2. Run the Deploy Command (be sure Docker is Open):

 > supabase functions deploy stripe-webhook

3. Verify the Deployment After deploying, verify that the function was successfully updated:
 > supabase functions list
You should see stripe-webhook listed as one of the deployed functions.

4. Check the Logs To ensure everything is working correctly after the update, monitor the logs for the function:

> supabase functions logs stripe-webhook
Test the Webhook

5. Go to the Stripe Dashboard → Webhooks.
Select your webhook endpoint and trigger a test event:

Check the logs again to confirm the event was processed.

To download the project From Firebase Studio run:
tar -czvf project.tar.gz --exclude=".*" .
then Righ click and Download