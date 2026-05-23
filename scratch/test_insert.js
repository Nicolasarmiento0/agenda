const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qkciuhruwwrsikmkhlqm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrY2l1aHJ1d3dyc2lrbWtobHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNjc2OTEsImV4cCI6MjA5Mjg0MzY5MX0.s8IgScQ-79kZTtA1Mx7XLVjUcNI-W_fbkJw-M7xtOIY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testInsert() {
  const { data, error } = await supabase.from('appointments').insert({
    business_id: '097618f1-1690-4022-8261-8bcb91ac500a',
    client_name: 'Test Nico',
    service: 'Corte + Barba',
    date: '2026-05-24',
    start_hour: 10,
    duration_hours: 1,
    worker_id: '4f2d0bc7-dbda-4a87-a81e-def4e3a3c2b9',
    client_id: null,
    status: 'pending'
  }).select();

  if (error) {
    console.error('Error inserting:', error);
  } else {
    console.log('Success:', data);
  }
}

testInsert();
