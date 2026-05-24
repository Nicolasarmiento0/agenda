const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qkciuhruwwrsikmkhlqm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrY2l1aHJ1d3dyc2lrbWtobHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNjc2OTEsImV4cCI6MjA5Mjg0MzY5MX0.s8IgScQ-79kZTtA1Mx7XLVjUcNI-W_fbkJw-M7xtOIY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspect() {
  console.log("=== INSPECTING BUSINESSES ===");
  const { data: businesses, error } = await supabase.from('businesses').select('*');
  if (error) {
    console.error("Error:", error);
  } else {
    console.log(`Found ${businesses.length} businesses:`);
    businesses.forEach(b => {
      console.log(`- ID: ${b.id}, Name: ${b.name}, Owner: ${b.owner_id}, Status: ${b.status}`);
      console.log(`  Opening: ${b.opening_time}, Closing: ${b.closing_time}`);
      console.log(`  Schedule: ${JSON.stringify(b.schedule)}`);
    });
  }
}

inspect();
