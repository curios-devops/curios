ToDO:
1. analize the flow for pro search, chech how the swarm is configured for pro search , validate if the diagram still up to date for **Pro Search** :
User Query
    |
    v
UI Agent  <---->  Orchestrator Agent / Swarm controller
    |
    +--> Perspective Generator Agent--> Information Retriever --> Article AgentWriter
    ^
    | (response with perspectives)
    |
Final Answer to User. so focus

2. If Research analist still in code remode from the workflow.

3. Retrofit the perspective generator Agent to use the same structure that use agent writer in regular search, for calling openAI , it seem it still has legacy not working code so copy the structure of writer agent working API call to open AI, ( be carefull do not touch regular search that is working just work in pro search ).

4. To test the new retrofited PerspectiveAgent, active and use the Swarmcontroller (is part of what we are testing ) and add a button to write the perspective questions in screen (in the second column of our /pro-search-test page )