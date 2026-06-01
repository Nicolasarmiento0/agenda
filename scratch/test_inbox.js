const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qkciuhruwwrsikmkhlqm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrY2l1aHJ1d3dyc2lrbWtobHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNjc2OTEsImV4cCI6MjA5Mjg0MzY5MX0.s8IgScQ-79kZTtA1Mx7XLVjUcNI-W_fbkJw-M7xtOIY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testInbox() {
  const { data: appts, error: aErr } = await supabase
    .from('appointments')
    .select('id, client_id')
    .not('client_id', 'is', null)
    .limit(1);

  if (aErr || !appts || appts.length === 0) {
    console.error('No client appointments found or error:', aErr?.message);
    return;
  }

  const clientId = appts[0].client_id;
  console.log('Testing inbox query for client:', clientId);

  // Current client query in inbox.tsx:
  const { data, error } = await supabase
    .from('appointments')
    .select('id, service, date, status, created_at, updated_at, businesses(name)')
    .eq('client_id', clientId)
    .in('status', ['confirmed', 'completed', 'rescheduled', 'no-show', 'cancelled'])
    .order('updated_at', { ascending: false })
    .limit(40);

  if (error) {
    console.error('Client inbox query FAILED:', error.message);
  } else {
    console.log('Client inbox query SUCCESS, found:', data.length);
  }
}

testInbox();
