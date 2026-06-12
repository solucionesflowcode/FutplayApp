import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users.users.find(u => u.email === 'joaquin.lepe.seg@gmail.com');
  if (!user) { console.error('User not found'); return; }
  console.log('User ID:', user.id);

  const { data: membresias } = await supabase
    .from('membresia')
    .select('*, plan(*)')
    .eq('usuario_id', user.id)
    .order('mes', { ascending: false });

  console.log('\nMembresías:', JSON.stringify(membresias, null, 2));

  const { data: boletas } = await supabase
    .from('boleta')
    .select('*')
    .eq('usuario_id', user.id)
    .order('created_at', { ascending: false });

  console.log('\nBoletas:', JSON.stringify(boletas, null, 2));

  const { data: clases } = await supabase
    .from('clase_usuario')
    .select('*, clase!inner(titulo, fecha_hora)')
    .eq('usuario_id', user.id);

  console.log('\nClase_usuario:', JSON.stringify(clases, null, 2));
}

main().catch(console.error);
