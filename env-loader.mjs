// Development environment helper - loads .env file explicitly
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env file from the project root
const envPath = resolve(process.cwd(), '.env');
console.log('📁 Loading .env from:', envPath);

const result = config({ path: envPath });

if (result.error) {
  console.error('❌ Failed to load .env file:', result.error);
} else {
  console.log('✅ .env file loaded successfully');
  console.log('🔑 VITE_OPENAI_API_KEY available:', !!process.env.VITE_OPENAI_API_KEY);
}

export default result;
