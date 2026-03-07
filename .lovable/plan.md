

# Fix: "Impossible de traiter la demande" -- Role Request Approval

## Root Cause

The RPC functions `approve_role_request` and `reject_role_request` have **no EXECUTE grants** for the `authenticated` role. When the admin calls `supabase.rpc('approve_role_request', ...)`, Supabase returns a permission denied error.

## Fix

Run a migration to grant EXECUTE on both functions to `authenticated`:

```sql
GRANT EXECUTE ON FUNCTION public.approve_role_request(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_role_request(uuid, uuid, text) TO authenticated;
```

No frontend code changes needed. The functions are already `SECURITY DEFINER` with proper logic -- they just couldn't be called.

## Files Modified

| File | Change |
|------|--------|
| New migration SQL | GRANT EXECUTE on both RPC functions to `authenticated` |

