import {createClient} from '@supabase/supabase-js';

export const client = createClient(
  'https://zeeleyaadpbwpznxbkcp.supabase.co',
  'sb_publishable_NxeFA4U0_PrcHb7rjr7SVA_C1YIo_J5',
  {auth: {detectSessionInUrl: false}},
);
