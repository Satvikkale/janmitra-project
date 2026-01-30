How to Start 
cd apps/api :- pnpm start:dev
cd apps/web :- pnpm dev
cd apps/mobile :- pnpm start, press a to open the Android emulator

## Web Admin Panel
**Platform Admin Dashboard**: http://localhost:3000/admin
- View pending society registration requests
- Approve or reject societies  
- Automatically updates society head roles and permissions when approved

### Grant Platform Admin Access
To access the admin panel, you need a user account with `platform_admin` role.

**Add platform_admin role to an existing user:**
```bash
cd apps/api
npx ts-node src/seed/add-platform-admin.ts <email_or_phone>
```

Example:
```bash
npx ts-node src/seed/add-platform-admin.ts admin@example.com
```

**Important:** After adding the role, log out and log in again on the web app for changes to take effect.