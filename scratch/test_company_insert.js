const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qkciuhruwwrsikmkhlqm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrY2l1aHJ1d3dyc2lrbWtobHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNjc2OTEsImV4cCI6MjA5Mjg0MzY5MX0.s8IgScQ-79kZTtA1Mx7XLVjUcNI-W_fbkJw-M7xtOIY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testCompanyInsert() {
  const randomEmail = `testnico_${Math.floor(Math.random() * 1000000)}@gmail.com`;
  const password = 'password123';

  console.log('Signing up user:', randomEmail);
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: randomEmail,
    password: password
  });

  if (signUpError) {
    console.error('Sign up error:', signUpError.message);
    return;
  }

  const user = signUpData.user;
  const session = signUpData.session;
  console.log('Sign up successful! User ID:', user.id);

  // Authenticate the client instance with the user's session
  const authSupabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
  await authSupabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token
  });

  // 1. Update user's profile role to 'company'
  const { error: roleError } = await authSupabase
    .from('profiles')
    .update({ role: 'company' })
    .eq('id', user.id);

  if (roleError) {
    console.error('Error updating role to company:', roleError.message);
    return;
  }
  console.log('Successfully set role to company!');

  // 2. Try inserting a regular appointment as company (client_id: null)
  const { data: companyAppt, error: companyError } = await authSupabase.from('appointments').insert({
    business_id: '097618f1-1690-4022-8261-8bcb91ac500a',
    client_name: 'Regular Customer',
    service: 'Corte',
    date: '2026-05-26',
    start_hour: 11,
    duration_hours: 1,
    worker_id: '4f2d0bc7-dbda-4a87-a81e-def4e3a3c2b9',
    client_id: null,
    status: 'pending'
  }).select();

  if (companyError) {
    console.error('INSERT ERROR FOR COMPANY (regular appt):', companyError);
  } else {
    console.log('INSERT SUCCESS FOR COMPANY (regular appt):', companyAppt);
  }

  // 3. Try inserting a blocked appointment as company (status: 'blocked', client_id: null)
  const { data: blockedAppt, error: blockedError } = await authSupabase.from('appointments').insert({
    business_id: '097618f1-1690-4022-8261-8bcb91ac500a',
    client_name: 'Bloqueo de horario',
    service: 'Bloqueo',
    date: '2026-05-26',
    start_hour: 12,
    duration_hours: 1,
    worker_id: '4f2d0bc7-dbda-4a87-a81e-def4e3a3c2b9',
    client_id: null,
    status: 'confirmed'
  }).select();

  if (blockedError) {
    console.error('INSERT ERROR FOR COMPANY (blocked appt):', blockedError);
  } else {
    console.log('INSERT SUCCESS FOR COMPANY (blocked appt):', blockedAppt);
  }
}

testCompanyInsert();
