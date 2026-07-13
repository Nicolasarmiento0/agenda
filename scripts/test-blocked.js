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
  // Let's call a RPC or run a query that might fail or get database info.
  // Wait, since we don't have direct SQL run permission via anon key, we can try to query a known view or try to insert a record with status 'blocked' in a try/catch.
  // We can use a random UUID to avoid conflicts.
  console.log("Trying to insert an appointment with status 'blocked' to see if it's allowed...");
  const tempId = '00000000-0000-0000-0000-000000000009';
  
  // To avoid actual insert succeeding and leaving trash, we can try to insert with a non-existent business_id, which will fail with a foreign key error if the status check passes, or a check constraint error if it fails.
  // Or we can just insert with a valid structure and immediately delete it.
  // Let's first fetch a valid business_id and worker_id from availability_slots.
  const { data: slots, error: slotErr } = await supabase
    .from('availability_slots')
    .select('business_id, worker_id')
    .limit(1);
    
  if (slotErr || !slots || slots.length === 0) {
    console.error("Could not fetch a valid slot:", slotErr);
    return;
  }
  
  const { business_id, worker_id } = slots[0];
  console.log(`Using business_id: ${business_id}, worker_id: ${worker_id}`);
  
  const testRecord = {
    business_id,
    worker_id,
    date: '2030-01-01',
    start_hour: 9,
    duration_hours: 1,
    client_name: 'Test Blocked Status',
    service: 'Test',
    status: 'blocked',
    price: 0
  };
  
  const { data: insertData, error: insertErr } = await supabase
    .from('appointments')
    .insert(testRecord)
    .select();
    
  if (insertErr) {
    console.log("Insert failed. Error code:", insertErr.code, "Message:", insertErr.message);
  } else {
    console.log("Insert succeeded!", insertData);
    // Immediately delete the test record
    const { error: deleteErr } = await supabase
      .from('appointments')
      .delete()
      .eq('id', insertData[0].id);
    console.log("Delete status:", deleteErr ? deleteErr.message : "Success");
  }
}

run();
