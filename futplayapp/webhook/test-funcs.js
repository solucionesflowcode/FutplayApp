const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const tests = [
    { name: 'check_is_staff', args: {} },
    { name: 'get_proxima_clase', args: { p_usuario_id: 'b9944865-6670-4455-ba37-bb8e76346435' } },
    { name: 'get_proxima_clase', args: { p_usuario_id: 'f21dd38f-06f2-4ccd-a4a8-2894c27f96ed' } },
    { name: 'devolver_token', args: { p_usuario_id: 'b9944865-6670-4455-ba37-bb8e76346435' } },
    { name: 'inscribir_usuario_clase', args: { p_usuario_id: null, p_clase_id: null } },
  ];

  for (const t of tests) {
    try {
      const { data, error } = await supabase.rpc(t.name, t.args);
      console.log(`${t.name}:`, error ? `ERROR: ${error.code} ${error.message}` : `OK: ${JSON.stringify(data)}`);
    } catch(e) {
      console.log(`${t.name}: EXCEPTION: ${e.message}`);
    }
  }

  // Also test get_proxima_clase with proper UUID format
  console.log('\n--- Probando get_proxima_clase con cada usuario ---');
  const { data: users } = await supabase.from('usuario').select('id, nombre');
  for (const u of users) {
    try {
      const { data, error } = await supabase.rpc('get_proxima_clase', { p_usuario_id: u.id });
      if (error) console.log(`${u.nombre}: ERROR ${error.code} - ${error.message}`);
      else console.log(`${u.nombre}: ${data ? JSON.stringify(data) : '(null)'}`);
    } catch(e) {
      console.log(`${u.nombre}: EXCEPTION ${e.message}`);
    }
  }
}
main().catch(console.error);
