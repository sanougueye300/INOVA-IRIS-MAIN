import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env file manually
const envPath = path.resolve(process.cwd(), '.env');
const envConfig = {};
if (fs.existsSync(envPath)) {
  const fileContent = fs.readFileSync(envPath, 'utf8');
  fileContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.substring(1, value.length - 1);
      }
      envConfig[key] = value;
    }
  });
}

const supabaseUrl = envConfig.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = envConfig.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing environment variables VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("Logging in as admin...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'sanougueye300@gmail.com',
    password: 'password123'
  });

  if (authError) {
    console.error("Login failed:", authError.message);
    process.exit(1);
  }

  console.log("Logged in successfully. Access token:", authData.session.access_token.substring(0, 20) + "...");

  const testEmail = `agent_${Date.now()}@example.com`;
  console.log(`Invoking admin-create-user Edge Function for ${testEmail}...`);

  const body = {
    email: testEmail,
    fullName: "Test Agent",
    organization: "SONATEL / CYBER",
    role: "analyste",
    generation: "v2",
    phone: "+221 77 000 00 00",
    matricule: "TEST-MAT-123",
    physicalAddress: "technopole",
    city: "Dakar",
    info: "Test user created by automated script",
    tagPolicy: "everyone",
    isActive: true,
    permissions: {
      dispatching: true,
      showExperiences: true,
      showFollowers: false
    }
  };

  const { data, error } = await supabase.functions.invoke("admin-create-user", {
    body,
    headers: {
      Authorization: `Bearer ${authData.session.access_token}`
    }
  });

  if (error) {
    console.error("Edge function returned error:");
    console.error(error);
    if (error.context && typeof error.context.json === 'function') {
      try {
        const errJson = await error.context.json();
        console.error("Error body:", errJson);
      } catch (e) {
        try {
          const text = await error.context.text();
          console.error("Error text:", text);
        } catch (_) {}
      }
    }
  } else {
    console.log("Success! Edge function response:", data);
  }
}

run();
