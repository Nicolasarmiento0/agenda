const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qkciuhruwwrsikmkhlqm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrY2l1aHJ1d3dyc2lrbWtobHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNjc2OTEsImV4cCI6MjA5Mjg0MzY5MX0.s8IgScQ-79kZTtA1Mx7XLVjUcNI-W_fbkJw-M7xtOIY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLoading() {
  const { data: appts, error: aErr } = await supabase
    .from('appointments')
    .select('id, client_id, client_name, service, date, start_hour')
    .not('client_id', 'is', null)
    .limit(10);

  if (aErr) {
    console.error('Error fetching appointments:', aErr.message);
    return;
  }

  const clientIds = [...new Set(appts.map(a => a.client_id))];
  console.log('Testing client IDs:', clientIds);

  const todayStr = new Date().toISOString().split('T')[0];
  console.log('Today date string (UTC):', todayStr);

  for (const testClientId of clientIds) {
    console.log(`\n--- Client ID: ${testClientId} ---`);
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id,
        date,
        start_hour,
        status,
        service,
        price,
        business:businesses(name, address),
        workers(name)
      `)
      .eq('client_id', testClientId)
      .gte('date', todayStr)
      .order('date', { ascending: true })
      .order('start_hour', { ascending: true });

    if (error) {
      console.error('Supabase query error:', error.message);
      continue;
    }

    console.log(`Fetched ${data.length} appointments from Supabase (including all statuses).`);

    const processed = data.map((appt) => {
      const hours = Math.floor(appt.start_hour);
      const minutes = Math.round((appt.start_hour % 1) * 60);
      const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
      const apptDate = new Date(`${appt.date}T${timeStr}`);
      
      return {
        ...appt,
        start_time: apptDate.toISOString()
      };
    });

    const now = new Date();
    const upcoming = processed.filter(appt => new Date(appt.start_time).getTime() >= now.getTime());
    
    console.log('Processed & filtered upcoming appointments (first 5):');
    console.log(upcoming.slice(0, 5));
  }
}

testLoading();
