const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qkciuhruwwrsikmkhlqm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrY2l1aHJ1d3dyc2lrbWtobHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNjc2OTEsImV4cCI6MjA5Mjg0MzY5MX0.s8IgScQ-79kZTtA1Mx7XLVjUcNI-W_fbkJw-M7xtOIY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectPolicies() {
  console.log("=== INSPECTING RLS POLICIES ===");
  // Query RLS policies from pg_policies via RPC or raw query if we have an RPC,
  // or let's try to query it. But wait, Anon Key might not have select permission on pg_policies!
  // Let's see if we can read it.
  const { data, error } = await supabase.rpc('get_policies_for_table', { table_name: 'appointments' });
  if (error) {
    console.log("RPC get_policies_for_table not found or error:", error.message);
    // As a fallback, let's query pg_policies using custom query if there is any custom endpoint, 
    // or let's try a simple select from pg_policies via supabase.from('pg_policies') if exposed (unlikely).
    const { data: pgData, error: pgErr } = await supabase.from('pg_policies').select('*');
    console.log("Direct pg_policies query error:", pgErr ? pgErr.message : "Success");
  } else {
    console.log("Policies:", data);
  }
}

inspectPolicies();
