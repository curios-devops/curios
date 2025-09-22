require('dotenv').config();

module.exports = {
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_KEY,
  },
  server: {
    port: process.env.PORT || 3000,
  },
  security: {
    allowedQueries: process.env.ALLOWED_QUERY_TYPES 
      ? process.env.ALLOWED_QUERY_TYPES.split(',') 
      : ['SELECT'],
  }
};