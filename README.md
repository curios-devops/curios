## APP NAME
CuriosAI.com

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


## PITCH
CuriosAI is an AI-powered search engine building using Bolt tech stack, designed to provide comprehensive answers by utilizing advanced machine learning algorithms.

## APP DESCRIPTION
CuriosAI is an AI-powered searching tool or an multiagent AI-powered search engine that goes deep into the internet to find answers. Inspired by Perplexity AI, it's an option that not just searches the web but understands your questions. It uses advanced machine learning algorithms to refine results and provides clear answers with sources cited.

Using SearxNG to stay current and fully open source, CuriosAI ensures you always get the most up-to-date information without compromising your privacy. Also backed by Tavily, GoDaddy and Wiki, to ensure user always get answered.

**Features:**
Storm by Stanford Model: to make more robust answer, so when user give an open-minded question a perspective agent is call to enrich the queston so get diferent point of view answers.

Focus Modes (Future development): Special modes to better answer specific types of questions. Perplexica currently has 6 focus modes:
All Mode: Searches the entire web to find the best results.
Writing Assistant Mode: Helpful for writing tasks that does not require searching the web.
Academic Search Mode: Finds articles and papers, ideal for academic research.
YouTube Search Mode: Finds YouTube videos based on the search query.
Wolfram Alpha Search Mode: Answers queries that need calculations or data analysis using Wolfram Alpha.
Reddit Search Mode: Searches Reddit for discussions and opinions related to the query.

Current Information: Some search tools might give you outdated info because they use data from crawling bots and convert them into embeddings and store them in a index. Unlike them, CuriosAI uses SearxNG, a metasearch engine to get the results and rerank and get the most relevant source out of it, ensuring you always get the latest information without the overhead of daily data updates.

### Origins and Influences

1. **Swarm (Multi-Agent Coordination)**  
   - Swarm-like architectures inspire the idea of multiple independent agents working in parallel, each focusing on a specific piece of the query.

2. **Stanford’s Storm (Question Generation + Prewriting)**  
   - Storm-style techniques encourage multi-perspective questioning, ensuring thorough coverage and deeper exploration of a topic before drafting final content.

3. **MindSearch (Graph-Based Task Decomposition & Parallel Execution)**  
   - From MindSearch, we integrate the concept of parallel searches and the dynamic breakdown of a larger query into smaller, more focused subtasks.

---

## Agents in ProSearch

ProSearch typically features **five operational agents** plus a user-facing interface:

1. **UI Agent**  
   - *Role*: Maintains a seamless interaction with the user.  
   - *Key Function*: Receives the user’s query, displays results, and shows progress or partial findings along the way.

2. **Orchestrator Agent**  
   - *Role*: The “conductor” of all other agents.  
   - *Key Function*: Receives the user’s request from the UI Agent, breaks it into subtasks (possibly via question generation), and delegates work to the other specialized agents.

3. **Perspective Generator**  
   - *Role*: Brainstorms angles, questions, and viewpoints about the user’s query.  
   - *Key Function*: Ensures a broad and deep coverage of the topic, taking inspiration from Storm’s prewriting approach.

4. **Information Retriever**  
   - *Role*: Gathers raw data from the web or any configured search API (e.g., SearXNG).  
   - *Key Function*: Executes optimized search queries, collects relevant links and snippets, and feeds them back for refinement.

5. **Research Analyst** (Optional in simpler flows)  
   - *Role*: Analyzes and summarizes the collected data.  
   - *Key Function*: Filters duplicates, flags conflicting info, and organizes findings into short bullet points or structured reference lists.

6. **Article Writer**  
   - *Role*: Produces a final written response or article.  
   - *Key Function*: Takes the refined data from the Research Analyst and composes a coherent, citation-backed write-up or summary.

---

## Typical ProSearch Flow

1. **User Submits Query**  
   - The user enters a query via the UI Agent (just like any standard search).  
   - The Orchestrator Agent then decides how to break down or parallelize the tasks.

2. **Multi-Perspective Generation**  
   - The Perspective Generator proposes different ways to explore the query (for example, brainstorming subtopics or specific angles).

3. **Parallel Information Retrieval**  
   - The Information Retriever fetches data for each subtopic in parallel.  
   - This approach, inspired by multi-agent orchestration (from Swarm and MindSearch), speeds up the discovery of relevant sources.

4. **Refinement & Summarization**  
   - The Research Analyst checks for consistency, removes duplicates, and creates a concise overview.  
   - If more details are needed, it can ask the Orchestrator to trigger additional searches or deeper exploration.

5. **Final Write-Up**  
   - The Article Writer turns the refined data into a cohesive, easy-to-read response (including citations).  
   - The result is sent to the UI Agent, which displays it in the user’s familiar interface.

---

## Benefits

1. **Depth & Breadth**  
   - By splitting queries into subtopics and handling them in parallel, ProSearch ensures more comprehensive coverage of complex subjects.

2. **Quality Outputs**  
   - Dedicated roles (Research Analyst, Article Writer) improve the final answer’s **clarity**, **accuracy**, and **usefulness**.

3. **Familiar Front-End**  
   - The standard “search-and-results” interface remains intact. ProSearch operates *behind the scenes*, maintaining user comfort and continuity.

4. **Scalability**  
   - Additional agents (like fact-checkers or domain experts) can be introduced seamlessly if the project grows in scope.

---

## Keeping It Simple for the User

Despite the advanced behind-the-scenes coordination:

- **User Interaction**: The user still types a query and sees search results or a generated article, much like any normal search engine.  
- **Insights**: Partial updates (“Searching…,” “Summarizing…,” “Drafting…”) are shown in the UI, enhancing transparency without complicating the design.

--
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
