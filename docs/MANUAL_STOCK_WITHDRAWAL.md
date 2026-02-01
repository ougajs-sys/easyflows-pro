# Manual Stock Withdrawal Feature

## Overview
This feature allows Supervisors and Administrators to manually withdraw stock items from a Delivery Person's inventory and return them to the Central Shop (Deposit) stock. This is useful for stock rebalancing, corrections, and administrative adjustments.

## Key Features

### 1. Authorization
- **Who can access:** Only users with `administrateur` or `superviseur` roles
- **Authorization enforcement:** Both frontend (UI) and backend (RPC function) enforce role checks

### 2. Mandatory Reason/Motif
- Users **must** provide a reason for the withdrawal
- The reason is recorded in the `stock_movements` table for audit purposes
- Example reasons: "Stock excédentaire", "Réorganisation", "Erreur d'allocation"

### 3. Stock Movement
- **From:** Delivery Person's stock (`delivery_person_stock` table)
- **To:** Central Shop stock (`products.stock` column)
- **Transaction safety:** All operations are atomic - if any step fails, no changes are made

### 4. Notification System
- Delivery Person receives a real-time notification when stock is withdrawn
- Notification includes:
  - Product name
  - Quantity withdrawn
  - Reason for withdrawal
- Notification type: `stock_adjustment`

## Technical Implementation

### Backend (Supabase)

#### RPC Function: `manual_withdrawal_from_delivery`
**Location:** `/supabase/migrations/20260201220000_manual_withdrawal_from_delivery.sql`

**Parameters:**
- `p_delivery_person_id` (uuid): ID of the delivery person
- `p_product_id` (uuid): ID of the product
- `p_quantity` (integer): Quantity to withdraw
- `p_reason` (text): **Mandatory** reason for withdrawal
- `p_performed_by` (uuid, optional): ID of user performing action (auto-populated from auth context)

**Returns:** JSON object with success status or error message

**Authorization Check:**
```sql
IF NOT (
  public.has_role('administrateur'::app_role, v_caller_id) OR
  public.has_role('superviseur'::app_role, v_caller_id)
) THEN
  RETURN json_build_object('success', false, 'error', 'Accès refusé...');
END IF;
```

**Stock Movement Record:**
```sql
INSERT INTO public.stock_movements (
  delivery_person_id, 
  product_id, 
  quantity,  -- Negative value indicates withdrawal
  movement_type,  -- 'adjustment'
  performed_by, 
  notes  -- Contains 'Retrait manuel: ' + reason
)
```

### Frontend

#### Component: `ManualWithdrawalDialog`
**Location:** `/src/components/supervisor/ManualWithdrawalDialog.tsx`

**Props:**
- `deliveryPersonId`: UUID of the delivery person
- `deliveryPersonName`: Display name for the delivery person
- `stockItems`: Array of stock items available for withdrawal
- `trigger`: React element that triggers the dialog

**Features:**
- Product selection dropdown (only shows products with stock > 0)
- Quantity input with validation
- Mandatory reason textarea
- Real-time stock availability display
- Form validation before submission

#### Integration: `StockTransferManager`
**Location:** `/src/components/supervisor/StockTransferManager.tsx`

**Enhancement:**
- Added "Retrait Manuel" button for each delivery person's stock section
- Button shows next to delivery person name
- Only visible to supervisors and administrators

#### Notifications: `useNotifications`
**Location:** `/src/hooks/useNotifications.tsx`

**Enhancement:**
- Added `stock_adjustment` notification type
- Real-time subscription to `stock_movements` table for delivery persons
- Filters for `adjustment` type movements with negative quantity
- Displays notification with product name, quantity, and reason

## Usage Flow

### For Supervisors/Administrators:

1. Navigate to **Stock** page (menu: "Stock Global")
2. Click on **Stock Livreurs** tab
3. Find the delivery person whose stock needs adjustment
4. Click **Retrait Manuel** button
5. In the dialog:
   - Select the product from dropdown
   - Enter quantity to withdraw
   - **Enter reason** (mandatory)
   - Click "Retirer le stock"
6. System performs withdrawal and shows success message

### For Delivery Persons:

1. Receive real-time notification when stock is withdrawn
2. Notification appears in notification bell (top right)
3. Notification shows:
   - ⚠️ Retrait de stock
   - Quantity and product name
   - Reason provided by supervisor
4. Can view stock history in "Mon Stock" > "Historique" to see adjustment

## Data Flow

```
┌─────────────────────┐
│  Supervisor Action  │
│  (Retrait Manuel)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ RPC: manual_withdrawal_from_delivery│
│ • Validates authorization           │
│ • Validates reason                  │
│ • Checks stock availability         │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  Stock Movement (Atomic)            │
│ 1. delivery_person_stock -= qty     │
│ 2. products.stock += qty            │
│ 3. stock_movements INSERT (log)     │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  Real-time Notification             │
│ • Delivery person receives alert    │
│ • Shows product, qty, reason        │
└─────────────────────────────────────┘
```

## Validation Rules

### Backend Validation:
- ✅ User must be admin or supervisor
- ✅ Reason must not be empty/whitespace
- ✅ Delivery person must exist
- ✅ Product must exist in delivery person's stock
- ✅ Quantity must not exceed available stock

### Frontend Validation:
- ✅ Product selection required
- ✅ Quantity must be positive integer
- ✅ Quantity must not exceed available stock
- ✅ Reason must be provided and not empty
- ✅ Button disabled when no stock available

## Error Handling

**Common Errors:**
- "Accès refusé..." - User lacks authorization
- "Un motif est obligatoire..." - Reason not provided
- "Livreur non trouvé" - Invalid delivery person ID
- "Stock livreur insuffisant..." - Insufficient stock
- "Produit non trouvé" - Invalid product ID

**Error Display:**
- Toast notification with error message
- Dialog remains open for user to correct
- Network errors caught and displayed

## Database Schema

### Table: `stock_movements`
```sql
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY,
  delivery_person_id UUID REFERENCES delivery_persons(id),
  product_id UUID REFERENCES products(id),
  quantity INTEGER,  -- Negative for withdrawals
  movement_type TEXT,  -- 'adjustment' for manual withdrawals
  performed_by UUID REFERENCES profiles(id),
  notes TEXT,  -- Contains reason
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Movement Type Indicators:
- `transfer_to_delivery`: Shop → Delivery
- `transfer_from_delivery`: Delivery → Shop (voluntary)
- `adjustment`: Manual withdrawal (forced)
- `sale`: Product sold
- `return`: Customer return

## Testing

### Manual Testing Checklist:
- [ ] Login as supervisor/administrator
- [ ] Navigate to Stock > Stock Livreurs
- [ ] Click "Retrait Manuel" on a delivery person with stock
- [ ] Verify product dropdown shows only items with stock
- [ ] Try submitting without reason (should fail)
- [ ] Try submitting with quantity > available (should fail)
- [ ] Submit valid withdrawal with reason
- [ ] Verify success toast appears
- [ ] Verify delivery person's stock decreased
- [ ] Verify central stock increased
- [ ] Login as delivery person
- [ ] Verify notification appears with reason
- [ ] Verify stock history shows adjustment

### Authorization Testing:
- [ ] Try accessing as 'appelant' role (should not see button)
- [ ] Try accessing as 'livreur' role (should not see button)

## Security Considerations

1. **RLS Policies:** Function uses `SECURITY INVOKER` to respect RLS
2. **Auth Context:** Uses `auth.uid()` to get authenticated user, not client-supplied parameter
3. **Role Verification:** Double-checked on backend, not just frontend
4. **Audit Trail:** All withdrawals logged with performer ID and reason
5. **SQL Injection Protection:** Uses parameterized queries
6. **Search Path Security:** Fixed to `public` schema

## Future Enhancements

### Potential Improvements:
1. **Bulk Withdrawals:** Withdraw multiple products at once
2. **Scheduled Withdrawals:** Plan withdrawals for future execution
3. **Withdrawal History:** Dedicated view for all withdrawal operations
4. **SMS Notifications:** Send SMS to delivery person in addition to app notification
5. **Photo Evidence:** Option to attach photos justifying withdrawal
6. **Approval Workflow:** Require confirmation from another supervisor
7. **Partial Withdrawal Alerts:** Warn if withdrawal leaves delivery person with insufficient stock for orders

## Troubleshooting

**Issue:** Button not visible
- **Check:** User role (must be admin or supervisor)
- **Check:** Stock page loaded correctly

**Issue:** Dialog shows "No stock available"
- **Check:** Delivery person has products in stock
- **Check:** Database connection working

**Issue:** Notification not received
- **Check:** Real-time subscriptions enabled
- **Check:** Delivery person is logged in
- **Check:** Notification permissions granted

**Issue:** Stock not updating
- **Check:** Database transaction completed
- **Check:** Query cache invalidated
- **Check:** Page refreshed or real-time update triggered

## Support

For issues or questions:
1. Check this documentation
2. Review error messages in browser console
3. Check database logs for transaction failures
4. Verify user permissions in `user_roles` table
5. Contact development team with specific error details
