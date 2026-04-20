<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

Should any migration need to be changed, do not change it and create a new migration file.

Do not make changes to the /powerasync/docker.

Do not run "bun dev" or "bun --bun next dev" or "bun --bun next start".

This project uses Powersync as the database, all CRUD operations should be done using its pattern.

Do not connect to the database in port 5434 for tests.

## Task Management
Use `/dex` to break down complex work, track progress across sessions, and coordinate multi-step implementations.
