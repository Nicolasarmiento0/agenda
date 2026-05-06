
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qkciuhruwwrsikmkhlqm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrY2l1aHJ1d3dyc2lrbWtobHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNjc2OTEsImV4cCI6MjA5Mjg0MzY5MX0.s8IgScQ-79kZTtA1Mx7XLVjUcNI-W_fbkJw-M7xtOIY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const categories = [
  { name: 'BARBERIA', icon: 'scissors' },
  { name: 'GIMNASIO', icon: 'activity' },
  { name: 'PESTAÑAS', icon: 'eye' },
  { name: 'SALÓN DE BELLEZA', icon: 'star' },
  { name: 'SPA/MASAJES', icon: 'heart' },
  { name: 'UÑAS', icon: 'feather' },
  { name: 'TALLER MECANICO', icon: 'tool' },
  { name: 'TATUADORES', icon: 'zap' }
];

async function update() {
  console.log('Attempting to update categories...');
  
  // 1. Rename existing ones by ID to match requested names
  const mapping = {
    '6cb0e2aa-eacf-4d9d-afdc-914952c7693d': { name: 'BARBERIA', icon: 'scissors' },
    'a699d121-41d9-47a2-8555-618d727ad3b6': { name: 'GIMNASIO', icon: 'activity' },
    'a25d7326-741c-4db1-8d1f-35f494020d46': { name: 'PESTAÑAS', icon: 'eye' },
    'a9230698-8b31-4fbd-85e2-39d04597cc62': { name: 'SALÓN DE BELLEZA', icon: 'star' },
    'c4c4b96d-62a4-42c4-bddf-bea264141f48': { name: 'SPA/MASAJES', icon: 'heart' },
    '2b2965de-7cb9-4255-a654-8a6b1830bff4': { name: 'UÑAS', icon: 'feather' }
  };

  for (const id in mapping) {
    const { error } = await supabase.from('service_categories').update(mapping[id]).eq('id', id);
    if (error) {
      console.log(`Failed to update ${mapping[id].name}: ${error.message}`);
    } else {
      console.log(`Updated ${mapping[id].name} successfully.`);
    }
  }

  // 2. Delete 'Otro'
  const { error: delError } = await supabase.from('service_categories').delete().eq('id', 'b1657c94-02dd-47f8-9780-8de7aa1da509');
  if (delError) console.log('Failed to delete "Otro":', delError.message);
  else console.log('Deleted "Otro" successfully.');

  // 3. Try to insert new ones
  const newOnes = [
    { name: 'TALLER MECANICO', icon: 'tool', is_active: true },
    { name: 'TATUADORES', icon: 'zap', is_active: true }
  ];

  for (const n of newOnes) {
    const { error } = await supabase.from('service_categories').insert([n]);
    if (error) console.log(`Failed to insert ${n.name}: ${error.message}`);
    else console.log(`Inserted ${n.name} successfully.`);
  }
}

update();
