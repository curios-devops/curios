ToDO:
 1. updte the serp-test file with an extra buton below

 2. we will Develop a new functionallyty for this new boton:

 2.1 take the first 4 results from Google reverse image, and append as a context for Brave search, so show the expanded query (the original query + context 
 
 ejemplo de resutado esperado: 
 Resultado esperado

Si el usuario sube una foto de un iPhone 17 ProMax y escribe

“alternativas más baratas con buena cámara”

El pipeline genera:

“alternativas más baratas con buena cámara. Relacionado con: { google reverse search context from image_results or web}, 

build a fucntion for context string function, like:

"Elon Musk Tesla 2025 earnings event site:youtube.com OR site:economictimes.com" 
Drop (site:...) filters (keep semantics only).
Keep only top5-10 keywords , top-4 website and images trunk long path names with ... 
be carefull to check total enreached query do not exceed maximum of 400 characters and 50 words extrict cap here. 

de esta forma Brave entiende perfectamente la intención y devuelve comparativas relevantes (Samsung, Pixel, etc.), aunque él nunca procesó la imagen.
Para esto sigue el workflowthe brave search es decir llama a web result e image result con enriched query (query original from user + Context from reverse google search ) 

3. escribe el  query enreached que usara brave 
4. escribe el payload final que entrega retriever agend 

only read code and just make updates in our serp test page 


