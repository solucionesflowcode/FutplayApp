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

  const { data: membresias, error: findError } = await supabase
    .from('membresia')
    .select('id, tokens_totales, plan_id')
    .eq('usuario_id', user.id);

  if (findError) { console.error('Error finding:', findError); return; }
  console.log('Membresías a eliminar:', JSON.stringify(membresias, null, 2));

  if (membresias.length > 0) {
    const ids = membresias.map(m => m.id);
    const { error } = await supabase.from('membresia').delete().in('id', ids);
    if (error) { console.error('Error deleting:', error); return; }
    console.log('Membresías eliminadas correctamente');
  } else {
    console.log('No hay membresías para eliminar');
  }
}

main().catch(console.error);
