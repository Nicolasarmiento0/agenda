const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/EXPO_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase.from('service_categories').select('*');
  if (error) {
    console.error('Error fetching categories:', error);
  } else {
    console.log('Categories:');
    data.forEach(cat => {
      console.log(`- ID: ${cat.id}, Name: ${cat.name}, ParentID: ${cat.parent_id}, Active: ${cat.is_active}`);
    });
  }
}
check();
