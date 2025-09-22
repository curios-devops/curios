import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Example: List tables using a custom RPC (adjust as needed)
async function listTables() {
  try {
    const { data, error } = await supabase.rpc('get_schema_information');
    if (error) {
      console.error('Error:', error);
    } else {
      console.log('Tables:', data);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

listTables();

// List columns in the 'profiles' table
async function listProfileColumns() {
  try {
    console.log('Calling get_table_information for profiles...');
  const { data, error } = await supabase.rpc('get_table_information', { p_table_name: 'profiles' });
    if (error) {
      console.error('Error fetching columns for profiles:', error);
    } else if (!data) {
      console.log('No data returned for columns in profiles (data is null or undefined).');
    } else if (Array.isArray(data) && data.length === 0) {
      console.log('No columns found in profiles table (empty array).');
    } else {
      console.log('Columns in profiles:', data);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

listProfileColumns();const { data, error } = await supabase.rpc('get_table_information', { p_table_name: 'profiles' });