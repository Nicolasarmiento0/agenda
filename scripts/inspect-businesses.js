const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

function getEnvVar(name) {
  const match = envContent.match(new RegExp(`^${name}=(.*)$`, 'm'));
  return match ? match[1].trim() : null;
}

const url = getEnvVar('EXPO_PUBLIC_SUPABASE_URL');
const key = getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY');

if (!url || !key) {
  console.error("Missing environment variables");
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  console.log("Fetching a business...");
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error("Error fetching businesses:", error);
  } else {
    console.log("Business columns:", data ? Object.keys(data[0]) : "None");
    console.log("Business sample data:", data);
  }
}

run();
