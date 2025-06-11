import { useEffect, useState } from 'react';

export default function EnvDebugger() {
  const [envVars, setEnvVars] = useState<Record<string, string>>({});
  
  useEffect(() => {
    // Collect all environment variables from import.meta.env
    const vars: Record<string, string> = {};
    
    // Log the entire import.meta.env object
    console.log('All environment variables:', import.meta.env);
    
    // Extract all properties from import.meta.env
    Object.keys(import.meta.env).forEach(key => {
      vars[key] = import.meta.env[key];
    });
    
    // Also check if process.env is available (based on the Vite config)
    console.log('Process env available:', typeof process !== 'undefined' && process.env);
    if (typeof process !== 'undefined' && process.env) {
      console.log('Process env:', process.env);
    }
    
    setEnvVars(vars);
  }, []);

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h2 className="text-lg font-bold mb-2">Environment Variables Debug</h2>
      <p className="mb-4">Using backend proxy for API access</p>
      
      <h3 className="font-semibold mb-2">Available Environment Variables:</h3>
      <pre className="bg-gray-200 p-2 rounded text-sm">
        {JSON.stringify(
          Object.fromEntries(
            Object.entries(envVars).filter(([key]) => !key.includes('API_KEY'))
          ),
          null,
          2
        )}
      </pre>
    </div>
  );
}