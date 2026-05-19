import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qkciuhruwwrsikmkhlqm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrY2l1aHJ1d3dyc2lrbWtobHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNjc2OTEsImV4cCI6MjA5Mjg0MzY5MX0.s8IgScQ-79kZTtA1Mx7XLVjUcNI-W_fbkJw-M7xtOIY';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectSchema() {
  // Let's just try to select 1 row from the likely tables
  const tables = ['businesses', 'workers', 'appointments', 'reviews', 'profiles'];
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    console.log(`\n--- TABLE: ${table} ---`);
    if (error) {
      console.error('Error:', error.message);
    } else {
      console.log('Columns:', data && data.length > 0 ? Object.keys(data[0]).join(', ') : 'Empty table, but exists!');
      if (data && data.length > 0) {
        console.log('Sample row:', data[0]);
      }
    }
  }
}

inspectSchema();
