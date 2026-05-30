# Database Migration Guide

## Overview
Complete migration from localStorage to Turso (SQLite) database for persistent, cross-device data storage.

## What's Been Created

### 1. Database Schema (`/lib/db-schema.ts`)
Complete schema for all application data:
- ✅ **users** - Authentication and user profiles
- ✅ **appointments** - Booking and scheduling
- ✅ **clients** - Customer management
- ✅ **staff** - Employee management
- ✅ **services** - Service catalog
- ✅ **products** - Inventory management
- ✅ **invoices** - Billing and payments
- ✅ **settings** - User preferences
- ✅ **payment_requests** - Plan upgrade requests
- ✅ **user_plans** - Active subscription plans

### 2. Generic CRUD API (`/app/api/data/[resource]/route.ts`)
Single API endpoint for all resources:
- `GET /api/data/[resource]?userId=xxx` - List all records
- `POST /api/data/[resource]` - Create new record
- `PUT /api/data/[resource]` - Update existing record
- `DELETE /api/data/[resource]?id=xxx&userId=xxx` - Delete record

### 3. Client Data Access Layer (`/lib/data-api.ts`)
Type-safe wrappers for database operations:
```typescript
import { appointments, clients, staff } from '@/lib/data-api';

// Fetch all appointments
const allAppointments = await appointments.getAll();

// Create new client
const newClient = await clients.create({
  name: "John Doe",
  phone: "+92 300 1234567",
  email: "john@example.com"
});

// Update appointment
await appointments.update({
  id: "apt_123",
  status: "completed",
  ...
});

// Delete service
await services.delete("srv_456");
```

### 4. Migration Utility (`/lib/migrate-to-db.ts`)
Automated migration from localStorage to database:
- Reads existing localStorage data
- Uploads to database via API
- Clears localStorage after successful migration

### 5. Migration Page (`/app/(dashboard)/dashboard/migrate/page.tsx`)
User-friendly interface for data migration:
- Shows migration progress
- Lists migrated resources
- Displays any errors
- Automatic cleanup after success

## How to Use

### For New Users
New users automatically use database storage. No action needed.

### For Existing Users (with localStorage data)
1. Visit `/dashboard/migrate`
2. Click "Start Migration"
3. Wait for migration to complete
4. Data is now in database!

### For Developers

#### Using the Data API
Replace localStorage calls with database API:

**Before (localStorage):**
```typescript
const appointments = JSON.parse(
  localStorage.getItem('werzio_appointments_user_123') || '[]'
);
```

**After (database):**
```typescript
import { appointments } from '@/lib/data-api';
const allAppointments = await appointments.getAll();
```

#### Creating New Records
```typescript
import { clients } from '@/lib/data-api';

const newClient = await clients.create({
  name: "Sarah Ahmed",
  phone: "+92 300 9876543",
  email: "sarah@example.com",
  notes: "Prefers morning appointments"
});
```

#### Updating Records
```typescript
import { appointments } from '@/lib/data-api';

await appointments.update({
  id: "apt_123",
  status: "completed",
  notes: "Client was very satisfied"
});
```

#### Deleting Records
```typescript
import { services } from '@/lib/data-api';

await services.delete("srv_456");
```

## Migration Checklist

### ✅ Completed
- [x] Database schema created
- [x] Generic CRUD API implemented
- [x] Client data access layer created
- [x] Migration utility built
- [x] Migration page created
- [x] Authentication migrated to database

### 📋 Next Steps
1. **Update existing pages** to use `data-api.ts` instead of localStorage
2. **Test migration** with existing localStorage data
3. **Deploy to production** with database enabled
4. **Monitor** for any issues

## Pages to Update

### High Priority
- [ ] `/dashboard/appointments/page.tsx` - Use `appointments.getAll()`
- [ ] `/dashboard/clients/page.tsx` - Use `clients.getAll()`
- [ ] `/dashboard/staff/page.tsx` - Use `staff.getAll()`
- [ ] `/dashboard/services/page.tsx` - Use `services.getAll()`
- [ ] `/dashboard/inventory/page.tsx` - Use `products.getAll()`
- [ ] `/dashboard/invoices/page.tsx` - Use `invoices.getAll()`

### Medium Priority
- [ ] `/dashboard/calendar/page.tsx` - Use `appointments.getAll()`
- [ ] `/dashboard/pos/page.tsx` - Use `products.getAll()`
- [ ] `/dashboard/settings/page.tsx` - Use database settings

### Low Priority
- [ ] Dashboard widgets - Update to use database
- [ ] Reports - Update to query database

## Benefits

### For Users
- ✅ **Cross-device access** - Sign in from any device
- ✅ **Never lose data** - No more browser storage issues
- ✅ **Faster performance** - Optimized database queries
- ✅ **Automatic backups** - Data is always safe

### For Developers
- ✅ **Type-safe** - Full TypeScript support
- ✅ **Consistent API** - Same pattern for all resources
- ✅ **Easy to extend** - Add new resources easily
- ✅ **Better debugging** - Server-side logging

## Example: Updating a Page

**Before:**
```typescript
// Old localStorage approach
const [appointments, setAppointments] = useState([]);

useEffect(() => {
  const stored = localStorage.getItem('werzio_appointments_user_123');
  setAppointments(stored ? JSON.parse(stored) : []);
}, []);

function addAppointment(apt) {
  const updated = [...appointments, apt];
  setAppointments(updated);
  localStorage.setItem('werzio_appointments_user_123', JSON.stringify(updated));
}
```

**After:**
```typescript
// New database approach
import { appointments as appointmentsAPI } from '@/lib/data-api';

const [appointments, setAppointments] = useState([]);

useEffect(() => {
  appointmentsAPI.getAll().then(setAppointments);
}, []);

async function addAppointment(apt) {
  const created = await appointmentsAPI.create(apt);
  setAppointments([...appointments, created]);
}
```

## Testing

### Test Migration
1. Create test data in localStorage
2. Visit `/dashboard/migrate`
3. Verify data appears in database
4. Check that localStorage is cleared

### Test CRUD Operations
```typescript
// Create
const client = await clients.create({ name: "Test", phone: "123" });

// Read
const all = await clients.getAll();

// Update
await clients.update({ ...client, name: "Updated" });

// Delete
await clients.delete(client.id);
```

## Troubleshooting

### Migration Fails
- Check browser console for errors
- Verify user is authenticated
- Check database connection

### Data Not Appearing
- Verify `userId` is correct
- Check API response in Network tab
- Ensure tables are created

### Performance Issues
- Add indexes for frequently queried fields
- Use pagination for large datasets
- Cache frequently accessed data

## Support

For issues or questions:
1. Check browser console for errors
2. Review API responses in Network tab
3. Check server logs for database errors

---

**Status:** Ready for implementation
**Last Updated:** 2026-05-30
