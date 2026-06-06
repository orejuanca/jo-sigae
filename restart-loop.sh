#!/bin/bash
export DATABASE_URL="postgresql://neondb_owner:npg_vDTFWj0OGL5e@ep-proud-star-ajqhfk11-pooler.c-3.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require"
cd /home/z/my-project
while true; do
  echo "$(date): Starting Next.js..."
  npx next dev -p 3000
  echo "$(date): Server died, restarting in 2s..."
  sleep 2
done
