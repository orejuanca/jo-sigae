const { spawn } = require('child_process');

// Fix: Override the SQLite DATABASE_URL with the Neon PostgreSQL URL
const env = { ...process.env };
env.DATABASE_URL = 'postgresql://neondb_owner:npg_vDTFWj0OGL5e@ep-proud-star-ajqhfk11-pooler.c-3.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require';

function startServer() {
  console.log('Starting Next.js server with PostgreSQL...');
  const child = spawn('npx', ['next', 'dev', '-p', '3000'], {
    cwd: '/home/z/my-project',
    stdio: 'inherit',
    env: env
  });

  child.on('exit', (code) => {
    console.log(`Server exited with code ${code}, restarting in 3s...`);
    setTimeout(startServer, 3000);
  });

  child.on('error', (err) => {
    console.error('Server error:', err);
    setTimeout(startServer, 3000);
  });
}

startServer();
