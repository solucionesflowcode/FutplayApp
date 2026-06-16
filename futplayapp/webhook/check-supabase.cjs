const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('URL:', url);
console.log('Key exists:', !!key);

if (!url || !key) { console.error('Faltan credenciales'); process.exit(1); }

const supabase = createClient(url, key);

async function main() {
  // 1. Check some users
  const { data: users, error: uErr } = await supabase
    .from('usuario')
    .select('id, nombre, rol')
    .limit(5);
  if (uErr) { console.log('ERR usuario:', uErr.message); } 
  else { console.log('USUARIOS:', JSON.stringify(users)); }

  // 2. Check some memberships
  const { data: mems, error: mErr } = await supabase
    .from('membresia')
    .select('id, usuario_id, tokens_totales, tokens_usados, mes')
    .limit(10);
  if (mErr) { console.log('ERR membresia:', mErr.message); }
  else { console.log('MEMBRESIAS:', JSON.stringify(mems)); }

  // 3. Check clase_usuario
  const { data: cu, error: cuErr } = await supabase
    .from('clase_usuario')
    .select('id, usuario_id, clase_id, asistencia')
    .limit(10);
  if (cuErr) { console.log('ERR clase_usuario:', cuErr.message); }
  else { console.log('CLASE_USUARIO:', JSON.stringify(cu)); }

  // 4. Query triggers via information_schema REST API
  const trigUrl = `${url}/rest/v1/rpc/`;
  console.log('\n--- Trying to get trigger info ---');
  
  // Use the Supabase Management API or query directly
  // Try querying pg_proc via SQL
  const sqlQuery = "SELECT proname, prosrc FROM pg_proc WHERE proname = 'manejar_inscripcion_clase'";
  
  // Supabase REST API supports raw SQL via the /rest/v1/ endpoint with special headers
  const restResp = await fetch(`${url}/rest/v1/`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Prefer': 'params=single-object'
    },
    body: JSON.stringify({ query: sqlQuery })
  });
  
  console.log('REST query status:', restResp.status);
  const restText = await restResp.text();
  console.log('REST response:', restText.substring(0, 500));

  // Try using Supabase's pg-meta endpoint
  console.log('\n--- Trying pg-meta ---');
  try {
    const metaResp = await fetch(`${url}/pg-meta/default/query`, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: sqlQuery })
    });
    console.log('pg-meta status:', metaResp.status);
    const metaText = await metaResp.text();
    console.log('pg-meta response:', metaText.substring(0, 1000));
  } catch (e) {
    console.log('pg-meta error:', e.message);
  }

  // Try information_schema.triggers
  console.log('\n--- Trying information_schema.triggers ---');
  try {
    const schemaUrl = `${url}/rest/v1/information_schema.triggers?trigger_name=in.(trigger_inscripcion,trigger_limite_15,trigger_limitar_15_alumnos)&select=trigger_name,event_manipulation,action_timing,action_statement,event_object_table`;
    const schemaResp = await fetch(schemaUrl, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Accept': 'application/json'
      }
    });
    console.log('Schema triggers status:', schemaResp.status);
    if (schemaResp.ok) {
      const data = await schemaResp.json();
      console.log('Triggers:', JSON.stringify(data, null, 2));
    } else {
      const text = await schemaResp.text();
      console.log('Error:', text.substring(0, 500));
    }
  } catch (e) {
    console.log('Schema error:', e.message);
  }
}

main().catch(console.error);
