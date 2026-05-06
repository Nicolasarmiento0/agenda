const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qkciuhruwwrsikmkhlqm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrY2l1aHJ1d3dyc2lrbWtobHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNjc2OTEsImV4cCI6MjA5Mjg0MzY5MX0.s8IgScQ-79kZTtA1Mx7XLVjUcNI-W_fbkJw-M7xtOIY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkCatalogServices() {
  const { data, error } = await supabase.from('catalog_services').select('*, service_categories(name)');
  if (error) {
    console.error('Error fetching catalog_services:', error);
    return;
  }
  console.log('Catalog Services:', JSON.stringify(data, null, 2));
}

checkCatalogServices();
