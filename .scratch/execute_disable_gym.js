const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/EXPO_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase
    .from('service_categories')
    .update({ is_active: false })
    .eq('id', '854d3db2-1e6c-4e61-be48-e7a3fb887bd9')
    .select();
    
  if (error) {
    console.error('Error executing update:', error.message);
  } else {
    console.log('Update result:', data);
  }
}

run();
