## CuriosAI
An AI-powered search engine building using Bolt tech stack, designed to provide comprehensive answers by utilizing advanced machine learning algorithms. It’s been mainly writing itself, with with a light touch of human guidance.

## APP DESCRIPTION
CuriosAI is an AI-powered searching tool or an multiagent AI-powered search engine that goes deep into the internet to find answers. Inspired by Perplexity AI, it's an option that not just searches the web but understands your questions. It uses advanced machine learning algorithms to refine results and provides clear answers with sources cited.

Using Brave/Tavily/SearxNG to stay current and fully open source, CuriosAI ensures you always get the most up-to-date information without compromising your privacy. Also backed by SearXNG, to ensure user always get answered.


**Focus Modes:**  (Legacy. was Available for all users.)

**Web:**
Purpose: Broad search across the internet.
Justification: Foundational and universal; expected in any search application.

**Video:**
Purpose: Discover and watch video content.
Justification: Video is a dominant content type, catering to both entertainment and educational purposes.

**Social:**
Purpose: Search discussions and opinions on social platforms.
Justification: Social insights are essential for users exploring trends or public sentiment.

**Writing:**
Purpose: Generate creative or professional text without conducting a web search.
Justification: Supports diverse use cases, from brainstorming to professional content creation.

**Early Adopter Modes (2 Modes)**
Free at launch to attract niche users and generate engagement.

**Travel & Local (Early Adopters):**
Purpose: Discover local recommendations, travel itineraries, and tips.
Justification: Appeals to travelers and locals seeking tailored, actionable insights. It can help grow a loyal user base quickly by addressing practical needs.

**Health & Fitness (Early Adopters):**
Purpose: Search for fitness plans, health tips, and reliable medical information.
Justification: Health and wellness are universally popular topics. Offering this mode for free initially can help attract a wide range of users.

**Pro Modes (2 Modes)**
Exclusive to paying users due to their higher perceived value.

**Research (Pro):**
Purpose: Access a wider range of academic papers, advanced case studies, and sophisticated research tools.
Justification: Researchers, students, and professionals are likely to pay for premium tools that streamline access to high-quality, credible information.

**Finance (Pro):**
Purpose: Explore market trends, investment insights, and advanced financial analyses.
Justification: Finance-focused users (e.g., investors, professionals) are willing to pay for accurate and detailed information, making this a highly monetizable mode.


## Agents in ProSearch

### Origins and Influences

1. **Swarm (Multi-Agent Coordination)**  
   - Swarm-like architectures inspire the idea of multiple independent agents working in parallel, each focusing on a specific piece of the query.

2. **Stanford’s Storm (Question Generation + Prewriting)**  
   - Storm-style techniques encourage multi-perspective questioning, ensuring thorough coverage and deeper exploration of a topic before drafting final content.

3. **MindSearch (Graph-Based Task Decomposition & Parallel Execution)**  
   - From MindSearch, we integrate the concept of parallel searches and the dynamic breakdown of a larger query into smaller, more focused subtasks.

---

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
- **Insights**: Partial updates (“Searching…,” “Summarizing…,” “Drafting…”) are shown in the UI, enhancing transparency).

1. User Types
Guest – Visitors who haven’t registered or logged in.
Standard – Logged-in users on the free tier.
Premium – Logged-in users on the paid (subscriber) tier.
This way, “Premium” clearly indicates the user is subscribed, avoiding confusion with any “Pro” references.

2. Subscription Tiers
Free Tier – Available for Standard users.
Paid Tier (or “Pro Tier” to keep some “Pro” branding) – For Premium users.
You can call your paid tier “Premium” —just make sure it aligns with your user naming. For instance, Premium user on the Premium (Paid) tier.

3. Search Levels
Basic Search – Included for Guest or Standard users.
Advanced Pro Search – An Advanced or “Pro” search for Premium users 
--

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
