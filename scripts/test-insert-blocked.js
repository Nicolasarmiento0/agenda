const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

function getEnvVar(name) {
  const match = envContent.match(new RegExp(`^${name}=(.*)$`, 'm'));
  return match ? match[1].trim() : null;
}

const url = getEnvVar('EXPO_PUBLIC_SUPABASE_URL');
const key = getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY');

if (!url || !key) {
  console.error("Missing environment variables");
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  const email = 'test_company_' + Math.random().toString(36).substring(7) + '@test.com';
  const password = 'Password123!';
  console.log(`\n--- STEP 1: Signing up company user: ${email} ---`);
  
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (authError) {
    console.error("Sign up error:", authError);
    return;
  }
  
  const user = authData.user;
  console.log("Sign up successful. User ID:", user.id);
  
  // Set role to company
  console.log("Setting role to 'company'...");
  const { error: roleError } = await supabase.rpc('set_initial_role', { p_role: 'company' });
  if (roleError) {
    console.error("Error setting role:", roleError);
    return;
  }
  console.log("Role set to 'company' successfully.");
  
  // Create a business
  console.log("Creating a business...");
  const { data: bizData, error: bizError } = await supabase
    .from('businesses')
    .insert({
      owner_id: user.id,
      name: 'Test Business',
      slug: 'test-business-' + Math.random().toString(36).substring(7),
      status: 'approved'
    })
    .select();
    
  if (bizError) {
    console.error("Error creating business:", bizError);
    return;
  }
  
  const businessId = bizData[0].id;
  console.log("Business created successfully. Business ID:", businessId);
  
  // Create a worker
  console.log("Creating a worker...");
  const { data: workerData, error: workerError } = await supabase
    .from('workers')
    .insert({
      business_id: businessId,
      name: 'Test Worker',
      color: '#FF0000',
      specialty: 'Testing'
    })
    .select();
    
  if (workerError) {
    console.error("Error creating worker:", workerError);
    return;
  }
  
  const workerId = workerData[0].id;
  console.log("Worker created successfully. Worker ID:", workerId);
  
  // 1. Insert appointment with status 'blocked'
  console.log("\n--- STEP 2: Inserting blocked slot with status = 'blocked' ---");
  const { data: apptData, error: apptError } = await supabase
    .from('appointments')
    .insert({
      business_id: businessId,
      worker_id: workerId,
      date: '2026-08-01',
      start_hour: 10,
      duration_hours: 1,
      client_name: 'Bloqueo de horario',
      service: 'Bloqueo',
      status: 'blocked',
      price: 0
    })
    .select();
    
  if (apptError) {
    console.error("Failed to insert status 'blocked' (Expected if SQL migration not run yet!):", apptError.message);
  } else {
    console.log("SUCCESS! Inserted blocked slot in database:", apptData[0]);
  }
  
  // 2. Insert overlapping appointment to test company bypass trigger
  console.log("\n--- STEP 3: Inserting overlapping slot as Company ---");
  const { data: apptOverlapData, error: apptOverlapError } = await supabase
    .from('appointments')
    .insert({
      business_id: businessId,
      worker_id: workerId,
      date: '2026-08-01',
      start_hour: 10.5, // 10:30 overlaps with 10:00-11:00
      duration_hours: 1,
      client_name: 'Overlapping Booking',
      service: 'Overlap Test',
      status: 'confirmed',
      price: 100
    })
    .select();
    
  if (apptOverlapError) {
    console.error("Failed to insert overlapping slot as Company:", apptOverlapError.message);
  } else {
    console.log("SUCCESS! Overlapping slot inserted as Company:", apptOverlapData[0]);
  }
  
  // 3. Test client double booking constraint
  const clientEmail = 'test_client_' + Math.random().toString(36).substring(7) + '@test.com';
  console.log(`\n--- STEP 4: Signing up client user: ${clientEmail} ---`);
  
  const { data: clientAuthData, error: clientAuthError } = await supabase.auth.signUp({
    email: clientEmail,
    password,
  });
  
  if (clientAuthError) {
    console.error("Client sign up error:", clientAuthError);
    return;
  }
  
  const clientUser = clientAuthData.user;
  console.log("Client sign up successful. User ID:", clientUser.id);
  
  // Set role to client
  console.log("Setting role to 'client'...");
  const { error: clientRoleError } = await supabase.rpc('set_initial_role', { p_role: 'client' });
  if (clientRoleError) {
    console.error("Error setting client role:", clientRoleError);
    return;
  }
  console.log("Role set to 'client' successfully.");
  
  // Try inserting an overlapping appointment as Client
  console.log("Inserting overlapping appointment as Client...");
  const { data: clientApptData, error: clientApptError } = await supabase
    .from('appointments')
    .insert({
      business_id: businessId,
      worker_id: workerId,
      date: '2026-08-01',
      start_hour: 10.25, // Overlaps with 10:00-11:00
      duration_hours: 1,
      client_name: 'Client Overlap Test',
      service: 'Client Overlap',
      status: 'pending',
      client_id: clientUser.id,
      price: 100
    })
    .select();
    
  if (clientApptError) {
    console.log("SUCCESS! Client overlap insertion was rejected as expected. Error:", clientApptError.message);
  } else {
    console.error("FAILURE! Client overlap was allowed!", clientApptData);
  }
}

run();
