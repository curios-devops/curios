class SchemaProvider {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
  }
  
  async getFullSchema() {
    // Query Supabase for full database schema
    const { data, error } = await this.supabase
      .rpc('get_schema_information', {});
    
    if (error) throw new Error(`Failed to get schema: ${error.message}`);
    
    return data;
  }
  
  async getTableInfo(tableName) {
    // Get detailed information about a specific table
    const { data, error } = await this.supabase
      .rpc('get_table_information', { table_name: tableName });
    
    if (error) throw new Error(`Failed to get table info: ${error.message}`);
    
    return data;
  }
}

module.exports = { SchemaProvider };