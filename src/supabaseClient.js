import { createClient } from '@supabase/supabase-js'

// Untuk Create React App gunakan REACT_APP_ prefix
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

// Validasi
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials!')
  console.log('URL:', supabaseUrl)
  console.log('Key:', supabaseAnonKey ? 'exists' : 'missing')
  throw new Error('Supabase environment variables are required')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)