// supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://enzohhulskcwniosqtnt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuem9oaHVsc2tjd25pb3NxdG50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNjY4OTgsImV4cCI6MjA3Mzg0Mjg5OH0.32dpWJR55BA_ROrGAd9KxE22X4wVGLRWQ2VGUFG0NKQ'

export const supabase = createClient(supabaseUrl, supabaseKey)