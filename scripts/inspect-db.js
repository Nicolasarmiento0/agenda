const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing environment variables");
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  console.log("Fetching some appointments...");
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .limit(10);

  if (error) {
    console.error("Error fetching appointments:", error);
  } else {
    console.log("Appointments:", data);
  }
}

run();
