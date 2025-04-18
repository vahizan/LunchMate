// Load dotenv using ES modules
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config();

console.log('Environment variables check:');
console.log('VITE_GOOGLE_MAPS_API_KEY:', process.env.VITE_GOOGLE_MAPS_API_KEY || 'undefined');
console.log('NODE_ENV:', process.env.NODE_ENV || 'undefined');

// Print all environment variables that start with VITE_
console.log('\nAll VITE_ environment variables:');
Object.keys(process.env)
  .filter(key => key.startsWith('VITE_'))
  .forEach(key => {
    console.log(`${key}: ${process.env[key]}`);
  });