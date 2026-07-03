const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qkciuhruwwrsikmkhlqm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrY2l1aHJ1d3dyc2lrbWtobHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNjc2OTEsImV4cCI6MjA5Mjg0MzY5MX0.s8IgScQ-79kZTtA1Mx7XLVjUcNI-W_fbkJw-M7xtOIY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuthInsert() {
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
  
  // Set the session manually
  await authSupabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token
  });

  // Try creating a profile first (since trigger might handle it, let's verify if profile exists)
  const { data: profile, error: pError } = await authSupabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  console.log('Profile select:', { profile, error: pError?.message });

  // Try inserting appointment as this authenticated client
  const { data: apptData, error: apptError } = await authSupabase.from('appointments').insert({
    business_id: '097618f1-1690-4022-8261-8bcb91ac500a',
    client_name: 'Client Nico Test',
    service: 'Corte',
    date: '2026-05-25',
    start_hour: 10,
    duration_hours: 1,
    worker_id: '4f2d0bc7-dbda-4a87-a81e-def4e3a3c2b9',
    client_id: user.id,
    status: 'pending'
  }).select();

  if (apptError) {
    console.error('INSERT ERROR FOR CLIENT:', apptError);
  } else {
    console.log('INSERT SUCCESS FOR CLIENT:', apptData);
  }
}

testAuthInsert();
