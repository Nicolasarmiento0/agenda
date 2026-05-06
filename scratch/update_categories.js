
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qkciuhruwwrsikmkhlqm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrY2l1aHJ1d3dyc2lrbWtobHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNjc2OTEsImV4cCI6MjA5Mjg0MzY5MX0.s8IgScQ-79kZTtA1Mx7XLVjUcNI-W_fbkJw-M7xtOIY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const requestedCategories = [
  { name: 'BARBERIA', icon: 'scissors' },
  { name: 'GIMNASIO', icon: 'activity' },
  { name: 'PESTAÑAS', icon: 'eye' },
  { name: 'SALÓN DE BELLEZA', icon: 'star' },
  { name: 'SPA/MASAJES', icon: 'heart' },
  { name: 'UÑAS', icon: 'feather' },
  { name: 'TALLER MECANICO', icon: 'tool' },
  { name: 'TATUADORES', icon: 'zap' }
];

async function updateCategories() {
  const { data: existing } = await supabase.from('service_categories').select('*');
  
  // 1. Delete 'Otro'
  const { error: delError } = await supabase.from('service_categories').delete().ilike('name', 'Otro');
  
  // 2. Map existing to find matches
  for (const req of requestedCategories) {
    const match = existing.find(ex => ex.name.toLowerCase() === req.name.toLowerCase());
    if (match) {
      // Update
      const { error } = await supabase.from('service_categories').update({ name: req.name, icon: req.icon }).eq('id', match.id);
      console.log(`Updated ${req.name}:`, error?.message || 'Success');
    } else {
      // Insert
      const { error } = await supabase.from('service_categories').insert([{ name: req.name, icon: req.icon, is_active: true }]);
      console.log(`Inserted ${req.name}:`, error?.message || 'Success');
    }
  }

  // 3. Optional: Delete categories that are not in requestedCategories
  // (We'll skip this to be safe unless they are definitely duplicates)
}

updateCategories();
