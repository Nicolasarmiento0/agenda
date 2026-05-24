const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qkciuhruwwrsikmkhlqm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrY2l1aHJ1d3dyc2lrbWtobHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNjc2OTEsImV4cCI6MjA5Mjg0MzY5MX0.s8IgScQ-79kZTtA1Mx7XLVjUcNI-W_fbkJw-M7xtOIY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// We will use a mock owner_id (e.g. from an existing business or from a dummy profile)
// Let's use owner_id from one of the active businesses to make it fully valid.
// In check_db, we saw owner_id "61fab408-6fd7-4022-a620-66a1a935d3ba"
const mockOwnerId = '61fab408-6fd7-4022-a620-66a1a935d3ba'; 

async function runTest() {
  console.log("=== SIMULATING BUSINESS ONBOARDING FLOW ===");
  
  const mockBusinessName = `Test Onboarding Biz ${Date.now()}`;
  const openingTime = "09:00";
  const closingTime = "20:00";
  
  // 1. Default Schedule JSONB
  const defaultSchedule = {
    '1': [{ start: openingTime, end: closingTime }],
    '2': [{ start: openingTime, end: closingTime }],
    '3': [{ start: openingTime, end: closingTime }],
    '4': [{ start: openingTime, end: closingTime }],
    '5': [{ start: openingTime, end: closingTime }],
    '6': [{ start: openingTime, end: closingTime }],
    '7': [],
  };

  const businessData = {
    owner_id: mockOwnerId,
    name: mockBusinessName,
    category_id: 'a896d8b5-55ff-4ea0-8b43-255e2cb838aa', // standard category ID
    address: 'Av. Test 1234, Santiago',
    status: 'pending',
    opening_time: `${openingTime}:00`,
    closing_time: `${closingTime}:00`,
    avatar_url: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be',
    instagram_url: 'https://instagram.com/testbiz',
    description: 'This is a premium automated onboarding test business.',
    schedule: defaultSchedule,
  };

  console.log("Inserting/Upserting business...");
  // Since we might already have a business for mockOwnerId, let's first check if RLS permits insertion or if we should select/upsert
  // Since we run in the server/node context with AnonKey, RLS might block it unless we are signed in.
  // But wait! If we do it, let's see if RLS blocks or allows it.
  const { data: biz, error: dbError } = await supabase
    .from('businesses')
    .insert(businessData)
    .select('id')
    .single();

  if (dbError) {
    console.error("Database Error on Insertion:", dbError);
    return;
  }
  
  console.log("✓ Business created successfully! ID:", biz.id);

  // 2. Insert default worker
  console.log("Inserting default worker...");
  const { data: worker, error: workerError } = await supabase
    .from('workers')
    .insert({
      business_id: biz.id,
      user_id: mockOwnerId,
      name: 'Owner Propietario',
      specialty: 'Servicios Generales',
      color: '#3B7BE0',
      active: true,
      available_days: ['1', '2', '3', '4', '5', '6']
    })
    .select('id')
    .single();

  if (workerError) {
    console.error("Database Error on Worker Creation:", workerError);
  } else {
    console.log("✓ Default worker created successfully! ID:", worker.id);
  }

  // 3. Insert default service
  console.log("Inserting default service...");
  const { data: service, error: serviceError } = await supabase
    .from('business_services')
    .insert({
      business_id: biz.id,
      name: 'Servicio Estándar',
      price: 10000,
      duration_min: 30,
      is_active: true,
    })
    .select('id')
    .single();

  if (serviceError) {
    console.error("Database Error on Service Creation:", serviceError);
  } else {
    console.log("✓ Default service created successfully! ID:", service.id);
  }

  // Cleanup: Let's delete this test business to leave DB pristine!
  console.log("Cleaning up test business...");
  const { error: cleanupError } = await supabase
    .from('businesses')
    .delete()
    .eq('id', biz.id);

  if (cleanupError) console.error("Cleanup error:", cleanupError);
  else console.log("✓ Cleanup complete!");
}

runTest();
