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