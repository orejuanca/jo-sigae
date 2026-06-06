#!/bin/bash
export DATABASE_URL="postgresql://z@localhost:5432/certificaciones"
cd /home/z/my-project
exec bun run dev
