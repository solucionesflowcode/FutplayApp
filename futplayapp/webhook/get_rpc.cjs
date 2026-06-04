const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data, error } = await supabase
    .rpc('get_proxima_clase', { p_usuario_id: null });

  console.log('Error:', JSON.stringify(error, null, 2));
  if (error?.message) {
    console.log('\n--- Checking function definition via raw query ---');
  }

  // Try using raw SQL via the sql endpoint
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/`;
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        query: `
          SELECT prosrc, proname, proargnames 
          FROM pg_proc 
          WHERE proname = 'get_proxima_clase'
        `
      })
    });
    const result = await res.json();
    console.log('SQL result:', JSON.stringify(result, null, 2));
  } catch(e) {
    console.log('SQL endpoint error:', e.message);
  }
}
main();
