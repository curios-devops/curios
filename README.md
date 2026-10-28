## CuriosAI
CuriosAI is an AI-powered multiagent web searching tool. Inspired by Perplexity, but focusing in the usuer looking for trust answer to evryday questions. 
Using search engines like Brave, SERPAPI, Tavily and SearXNG to stay current, CuriosAI ensures you always get the most up-to-date information.

## Agents Origins and Influences

1. **Stanford’s Storm (Question Generation + Prewriting)**  
   - Storm-style techniques encourage multi-perspective questioning, ensuring thorough coverage and deeper exploration of a topic before drafting final content.

2. **MindSearch (Graph-Based Task Decomposition & Parallel Execution)**  
   - From MindSearch, we integrate the concept of parallel searches and the dynamic breakdown of a larger query into smaller, more focused subtasks.

---


## How Search Works

No multi-agent framework: plain functions and parallel calls (the earlier Swarm-style controller and Pro Search agents were removed).

- **Search** (`src/services/search/controller.ts`): the web search and the media search run in parallel, then one LLM call writes the answer with citations and follow-ups.
- **Ask Deeper** (`src/services/search/deep/`): one LLM call expands the query into three searches (principal, counterpoint, expansion), they are retrieved in parallel, and one answer is synthesized from them.

---

## Keeping It Simple for the User

Despite the advanced behind-the-scenes coordination:

- **User Interaction**: The user still types a query and sees search results or a generated article, much like any normal search engine.  
- **Insights**: Partial updates (“Searching…,” “Summarizing…,” “Drafting…”) are shown in the UI, enhancing transparency).

1. User Types
Guest (visitor / free users) – Visitors who haven’t registered or logged in.
Normal (standard /regular / signed / free tier ) – Logged-in users on the free tier.
Premium (Pro / paid / subscriptor)– Logged-in users on the paid (subscriber) tier.
This way, “Premium” clearly indicates the user is subscribed, avoiding confusion with any “Pro” references.

2. Subscription Tiers
Free Tier – Available for Standard users.
Paid Tier (or “Pro Tier” to keep some “Pro” branding) – For Premium users.
You can call your paid tier “Premium” —just make sure it aligns with your user naming. For instance, Premium user on the Premium (Paid) tier.


## THREE SELECTOR
Run inside the input container in home page and has three options

Regular /page -> Pro /page 
1.Search Rearch -> ProSearch  ProSearchResults 
2.Insights InsightsResults-> Research ResearchResults
3. Labs LabsResuls-> Pro Labs ProLabsResuls (soon) 

Input Mode	Route	Page Component	Pro Parameter
Search	/search	SearchResults	No
Pro Search	/pro-search	ProSearchResults	?pro=true
Insights	/insights-results	InsightsResults	No
Research	/research-results	ResearcherResults	?pro=true
Labs	/labs-results	LabsResults	No
Pro Labs	/pro-labs-results	LabsResults	?pro=true

## TARGET AUDIENCE
CuriosAI is designed to cater to a diverse audience, focusing primarily on the following groups:
Researchers and Academics: With its Academic Search Mode, CuriosAI is tailored for users seeking scholarly articles and papers, making it an ideal tool for academic research and study.
Content Creators and Writers: The Writing Assistant Mode supports individuals engaged in writing tasks, helping them generate content without needing extensive web searches.
General Users: The app's All Mode allows everyday users to conduct comprehensive searches across the web, appealing to those looking for general information or multimedia content.
Data Analysts and Students: The Wolfram Alpha Search Mode is particularly beneficial for users needing calculations or data analysis, making it suitable for students and professionals in technical fields.
Social Media Enthusiasts: The Reddit Search Mode targets users interested in community discussions and opinions, providing insights from social media platforms.
Tech Enthusiasts and Developers: As an open-source platform, Perplexica attracts developers and tech enthusiasts who are interested in customizing the application or contributing to its development.
Overall, Sanp aims to serve anyone looking for a powerful search engine that understands user queries and delivers accurate, contextually relevant information.

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