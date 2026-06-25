const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

async function main() {
  // Get a test user and class
  const { data: users } = await supabase.from('usuario').select('id, nombre').limit(3);
  console.log('Users:', JSON.stringify(users));

  const { data: clases } = await supabase.from('clase').select('id, titulo').limit(3);
  console.log('Clases:', JSON.stringify(clases));

  // Check membership for first user
  const { data: mems } = await supabase
    .from('membresia')
    .select('*')
    .order('mes', { ascending: false })
    .limit(5);
  console.log('Memberships:', JSON.stringify(mems, null, 2));

  // Test: try to see function definition via a custom function
  // Supabase's pg-meta endpoint
  const metaUrl = `${url}/pg-meta/default/functions`;
  try {
    const resp = await fetch(metaUrl, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    if (resp.ok) {
      const data = await resp.json();
      const fn = data.find(f => f.name === 'manejar_inscripcion_clase');
      if (fn) console.log('Function definition:', JSON.stringify(fn, null, 2));
      else console.log('Function not found via pg-meta');
    } else {
      console.log('pg-meta functions status:', resp.status);
    }
  } catch(e) {
    console.log('pg-meta error:', e.message);
  }

  // Try the functions endpoint differently
  const metaUrl2 = `${url}/pg-meta/default/query`;
  try {
    const resp = await fetch(metaUrl2, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: "SELECT proname, prosrc FROM pg_catalog.pg_proc WHERE proname = 'manejar_inscripcion_clase'"
      })
    });
    const text = await resp.text();
    console.log('Raw query status:', resp.status);
    if (resp.ok) console.log('Function source:', text.substring(0, 2000));
    else console.log('Error:', text.substring(0, 500));
  } catch(e) {
    console.log('Raw query error:', e.message);
  }

  // Try to simulate an insert into clase_usuario to see the trigger
  if (users && users.length > 0 && clases && clases.length > 0) {
    const testUserId = users[0].id;
    const testClaseId = clases[0].id;
    console.log(`\nTesting insert for user=${testUserId}, clase=${testClaseId}`);
    
    const { data: before } = await supabase
      .from('membresia')
      .select('id, tokens_usados')
      .eq('usuario_id', testUserId)
      .order('mes', { ascending: false })
      .limit(1)
      .maybeSingle();
    console.log('Before insert - tokens_usados:', before?.tokens_usados);

    // Try inserting
    const { data: insertResult, error: insertError } = await supabase
      .from('clase_usuario')
      .insert({ usuario_id: testUserId, clase_id: testClaseId })
      .select('id')
      .single();
    
    if (insertError) {
      console.log('Insert error:', insertError.message, insertError.code, insertError.details);
    } else {
      console.log('Insert success, id:', insertResult?.id);
      
      const { data: after } = await supabase
        .from('membresia')
        .select('id, tokens_usados')
        .eq('usuario_id', testUserId)
        .order('mes', { ascending: false })
        .limit(1)
        .maybeSingle();
      console.log('After insert - tokens_usados:', after?.tokens_usados);
      
      // Cleanup: delete the test row
      await supabase.from('clase_usuario').delete().eq('id', insertResult.id);
    }
  }
}

main().catch(console.error);
