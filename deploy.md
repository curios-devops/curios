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

  ## DESIGN
Logo and Icon
Curios logo, consists of:
A dynamic icon that evokes concepts like exploration and Navegation to teh information lead by AI simbolzed by a Compass

**Color Palette**
The color scheme includes:
A techy dark blue that evolves the traditional hyperlink blue into a more modern tone12
Warm earthy hues and darker blue tones for sophistication1
Two shades of turquoise or sea-blue:
A lighter shade for the icon, evoking creativity and progress
A darker shade for the wordmark, representing excellence and professionalism3

**Typography**
Primary typeface: FK Display for the wordmark1
Secondary typeface: FK Grotesk for most applications, keeping the identity in the Florian Karsten family1

**Design Elements**
Minimalist aesthetic across various brand touchpoints1
Vibrant animations that bring the asterisk icon to life1
Posters with eclectic graphics anchored by the grounded Perplexity wordmark1
Some elements feature patterns with gradients and Art Deco-inspired designs2

**Brand Personality**
Emphasizes curiosity, discovery, and transparency4
Aims to be approachable while maintaining a sophisticated edge4
Draws inspiration from vintage tech aesthetics, particularly Apple ads from the 80s and 90s4
The overall design approach balances minimalism with thoughtful details, creating a cohesive and visually appealing brand identity that reflects CuriosAI's mission of providing accessible, high-quality information through advanced AI technology.

**Agent Guidelines**
Read and update agent guidelines for this app that are used by the AI agent
as context when generating new components or modules in this app.

## DESIGN APPROACH
sophisticated-minimalist

## KEY FEATURES
Clean, dark interfaces with subtle gradients, geometric patterns, and Art Deco-inspired elements. Focus on whitespace and typography to create a premium, tech-forward experience that remains approachable.

# SHAPES
Geometric shapes with Art Deco influence. Rounded corners on interactive elements contrast with sharp angles in decorative patterns. Subtle drop shadows and glows add depth without overwhelming.

# TYPOGRAPHY
Hierarchical type system using FK Displayor Montserrat Bold for branding, FK Grotesk for headings, and Inter for body text. Large, bold headlines contrast with refined body text to create clear visual hierarchy.
## TARGET AUDIENCE
CuriosAI is designed to cater to a diverse audience, focusing primarily on the following groups:
Researchers and Academics: With its Academic Search Mode, CuriosAI is tailored for users seeking scholarly articles and papers, making it an ideal tool for academic research and study.
Content Creators and Writers: The Writing Assistant Mode supports individuals engaged in writing tasks, helping them generate content without needing extensive web searches.
General Users: The app's All Mode allows everyday users to conduct comprehensive searches across the web, appealing to those looking for general information or multimedia content.
Data Analysts and Students: The Wolfram Alpha Search Mode is particularly beneficial for users needing calculations or data analysis, making it suitable for students and professionals in technical fields.
Social Media Enthusiasts: The Reddit Search Mode targets users interested in community discussions and opinions, providing insights from social media platforms.
Tech Enthusiasts and Developers: As an open-source platform, Perplexica attracts developers and tech enthusiasts who are interested in customizing the application or contributing to its development.
Overall, Sanp aims to serve anyone looking for a powerful search engine that understands user queries and delivers accurate, contextually relevant information.

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

1. Backup (just in case, opional)
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