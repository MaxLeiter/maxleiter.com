import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

if (typeof window !== 'undefined') {
  throw new Error('This script must be run on the server.')
}

dotenv.config( { 
  path: path.resolve(__dirname, '../../.env'),
  debug: true
})

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing env vars SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
}

const privateClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default privateClient
