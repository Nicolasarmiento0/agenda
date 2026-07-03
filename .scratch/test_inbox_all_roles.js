const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qkciuhruwwrsikmkhlqm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrY2l1aHJ1d3dyc2lrbWtobHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNjc2OTEsImV4cCI6MjA5Mjg0MzY5MX0.s8IgScQ-79kZTtA1Mx7XLVjUcNI-W_fbkJw-M7xtOIY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAll() {
  console.log('--- STARTING ALL ROLES INBOX QUERY TESTS ---');

  // 1. ADMIN TEST
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('id, client_name, service, date, status, created_at, businesses(name)')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    console.log('Admin global appointments fetch: SUCCESS, count =', data?.length);
  } catch (err) {
    console.error('Admin test failed:', err.message);
  }

  // 2. COMPANY TEST
  try {
    // Find a business first
    const { data: bizs } = await supabase.from('businesses').select('id, owner_id').limit(1);
    if (bizs && bizs.length > 0) {
      const biz = bizs[0];
      const { data, error } = await supabase
        .from('appointments')
        .select('id, client_name, service, date, status, created_at')
        .eq('business_id', biz.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      console.log(`Company appointments fetch (business_id=${biz.id}): SUCCESS, count =`, data?.length);
    } else {
      console.log('No businesses in DB to test Company query');
    }
  } catch (err) {
    console.error('Company test failed:', err.message);
  }

  // 3. WORKER TEST
  try {
    const { data: workers } = await supabase.from('workers').select('id').limit(1);
    if (workers && workers.length > 0) {
      const worker = workers[0];
      const { data, error } = await supabase
        .from('appointments')
        .select('id, client_name, service, date, status, created_at')
        .eq('worker_id', worker.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      console.log(`Worker appointments fetch (worker_id=${worker.id}): SUCCESS, count =`, data?.length);
    } else {
      console.log('No workers in DB to test Worker query');
    }
  } catch (err) {
    console.error('Worker test failed:', err.message);
  }

  // 4. CLIENT TEST
  try {
    const { data: clients } = await supabase.from('appointments').select('client_id').not('client_id', 'is', null).limit(1);
    if (clients && clients.length > 0) {
      const clientId = clients[0].client_id;
      const { data, error } = await supabase
        .from('appointments')
        .select('id, service, date, status, created_at, businesses(name)')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      console.log(`Client appointments fetch (client_id=${clientId}): SUCCESS, count =`, data?.length);
    } else {
      console.log('No clients in DB to test Client query');
    }
  } catch (err) {
    console.error('Client test failed:', err.message);
  }

  console.log('--- ALL ROLES INBOX QUERY TESTS FINISHED ---');
}

testAll();
