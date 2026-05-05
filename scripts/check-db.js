const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// We can read the URL and KEY from the environment or .env if they exist, or from lib/supabase.ts
const code = fs.readFileSync('lib/supabase.ts', 'utf8');
const urlMatch = code.match(/SUPABASE_URL = '(.*?)'/);
const keyMatch = code.match(/SUPABASE_ANON_KEY = '(.*?)'/);

if (urlMatch && keyMatch) {
  const supabase = createClient(urlMatch[1], keyMatch[1]);
  (async () => {
    // try to get tables by calling a non-existent table to get the error, or query the postgres meta table
    // Since we don't have direct SQL access through the JS client unless configured, we can just try to select from expected tables.
    console.log("Checking workers...");
    const { error: wErr } = await supabase.from('workers').select('*').limit(1);
    console.log("workers error:", wErr ? wErr.message : "Success");
    
    console.log("Checking appointments...");
    const { error: aErr } = await supabase.from('appointments').select('*').limit(1);
    console.log("appointments error:", aErr ? aErr.message : "Success");
    
    console.log("Checking bookings...");
    const { error: bErr } = await supabase.from('bookings').select('*').limit(1);
    console.log("bookings error:", bErr ? bErr.message : "Success");
  })();
} else {
  console.log("Could not parse supabase credentials");
}
