
import { createClient } from '@supabase/supabase-js';

// Supabase project details provided by the user
const supabaseUrl = 'https://huodcetrwapdedipjehg.supabase.co';
const supabaseKey = 'sb_publishable_oYgf2OWwc7-08G56WUs4UA_97QsFnr5';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to check connection
export const checkSupabaseConnection = async () => {
    try {
        const { data, error } = await supabase.from('building').select('count', { count: 'exact', head: true });
        return !error;
    } catch (e) {
        return false;
    }
};
