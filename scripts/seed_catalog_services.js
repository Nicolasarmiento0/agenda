const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qkciuhruwwrsikmkhlqm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrY2l1aHJ1d3dyc2lrbWtobHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNjc2OTEsImV4cCI6MjA5Mjg0MzY5MX0.s8IgScQ-79kZTtA1Mx7XLVjUcNI-W_fbkJw-M7xtOIY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seedCatalogServices() {
  const { data: categories, error } = await supabase.from('service_categories').select('id').not('parent_id', 'is', null);
  if (error) {
    console.error('Error fetching categories:', error);
    return;
  }

  const services = [];
  categories.forEach(cat => {
    services.push({ category_id: cat.id, name: 'Servicio 1' });
    services.push({ category_id: cat.id, name: 'Servicio 2' });
    services.push({ category_id: cat.id, name: 'Servicio 3' });
  });

  const { error: insertError } = await supabase.from('catalog_services').insert(services);
  if (insertError) {
    console.error('Error inserting catalog_services:', insertError);
    return;
  }
  console.log(`Successfully inserted ${services.length} services into catalog_services.`);
}

seedCatalogServices();
