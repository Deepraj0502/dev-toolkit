import { createClient } from '@supabase/supabase-js';

// Replace with your actual Supabase URL and Anon Key
const supabaseUrl = 'https://agiggkglojthqelofjyp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnaWdna2dsb2p0aHFlbG9manlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzNjY2NTEsImV4cCI6MjEwMDk0MjY1MX0.DW_hNK0po0YbjuCh_OIQP0wVpghIlsmh5VSGL74PLL4';

export const supabase = createClient(supabaseUrl, supabaseKey);