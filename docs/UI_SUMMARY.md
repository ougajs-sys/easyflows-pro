# Manual Stock Withdrawal Feature - UI/UX Summary

## Feature Overview
This feature adds a "Retrait Manuel" (Manual Withdrawal) button to the Stock Transfer Manager, allowing supervisors and administrators to withdraw stock from delivery persons with a mandatory reason.

## UI Components Added

### 1. Manual Withdrawal Button
**Location:** Stock page > Stock Livreurs tab > Each delivery person's stock section

```
┌──────────────────────────────────────────────────────────┐
│ [Truck Icon] Livreur Name                                │
│              3 produit(s) en stock                       │
│                                    [Retrait Manuel] ←NEW │
└──────────────────────────────────────────────────────────┘
```

**Properties:**
- Icon: AlertTriangle (⚠️)
- Text: "Retrait Manuel" (desktop) / "Retrait" (mobile)
- Variant: Outline button
- Size: Small
- Position: Top-right of each delivery person's stock card

### 2. Manual Withdrawal Dialog
**Triggered by:** Clicking "Retrait Manuel" button

```
┌───────────────────────────────────────────────────────────┐
│ ⚠️ Retrait manuel de stock                        [X]    │
├───────────────────────────────────────────────────────────┤
│ Retirer du stock de [Livreur Name] et le retourner à la │
│ boutique centrale. Le livreur sera notifié.              │
│                                                           │
│ Produit *                                                │
│ ┌─────────────────────────────────────────┐             │
│ │ Sélectionner un produit              ▼  │             │
│ └─────────────────────────────────────────┘             │
│                                                           │
│ Quantité à retirer *                                     │
│ ┌─────────────────────────────────────────┐             │
│ │ Ex: 5                                    │             │
│ └─────────────────────────────────────────┘             │
│ Stock disponible: 10                                     │
│                                                           │
│ Motif du retrait *                                       │
│ ┌─────────────────────────────────────────┐             │
│ │ Ex: Stock excédentaire, réorganisation, │             │
│ │ erreur d'allocation...                   │             │
│ │                                          │             │
│ └─────────────────────────────────────────┘             │
│ Ce motif sera enregistré et visible dans l'historique   │
│                                                           │
│                            [Annuler] [⚠️ Retirer le stock]│
└───────────────────────────────────────────────────────────┘
```

**Dialog Features:**
- **Title:** "Retrait manuel de stock" with warning icon
- **Description:** Explains action and notification
- **Product Selection:** Dropdown showing products with current stock levels
- **Quantity Input:** Number field with max validation
- **Reason Field:** Multi-line text area (mandatory)
- **Actions:** Cancel (outline) and Submit (destructive red) buttons

### 3. Notification for Delivery Person
**Appears in:** Notification Bell (top-right corner) for affected delivery person

```
┌───────────────────────────────────────────────────┐
│ 🔔 (Badge: 1)                                     │
└───────────────────────────────────────────────────┘
     │
     ▼
┌───────────────────────────────────────────────────┐
│ ⚠️ Retrait de stock                               │
│ 5 unité(s) de Produit X ont été retirées de      │
│ votre stock.                                      │
│ Motif: Stock excédentaire                        │
│                                                   │
│ Il y a quelques instants                         │
└───────────────────────────────────────────────────┘
```

**Notification Properties:**
- **Icon:** ⚠️ (warning triangle)
- **Title:** "Retrait de stock"
- **Message:** Includes quantity, product name, and reason
- **Type:** stock_adjustment
- **Real-time:** Appears immediately via Supabase real-time subscription

## User Flow Diagram

### Supervisor/Admin Flow:
```
1. Navigate to Stock Page
   ↓
2. Click "Stock Livreurs" Tab
   ↓
3. View Delivery Person's Stock
   ↓
4. Click "Retrait Manuel" Button
   ↓
5. Fill Dialog:
   - Select Product
   - Enter Quantity
   - Enter Reason (MANDATORY)
   ↓
6. Click "Retirer le stock"
   ↓
7. See Success Toast
   ↓
8. Stock Table Updates (Real-time)
```

### Delivery Person Flow:
```
1. Working/Logged In
   ↓
2. Notification Badge Appears (🔔 1)
   ↓
3. Click Notification Bell
   ↓
4. See "Retrait de stock" Notification
   ↓
5. Read Quantity, Product, and Reason
   ↓
6. Optional: View Stock History
   - Navigate to "Mon Stock"
   - Click "Historique"
   - See adjustment entry
```

## Responsive Design

### Desktop View:
- Button text: "Retrait Manuel"
- Full dialog width: 448px (max-w-md)
- All fields visible simultaneously
- Side-by-side buttons in footer

### Mobile View (< 640px):
- Button text: "Retrait" (shortened)
- Dialog adapts to screen width
- Stacked form fields
- Full-width buttons in footer

## Visual States

### Button States:
1. **Default:** Outline style, visible to admin/supervisor
2. **Hover:** Background color change
3. **Disabled:** Grayed out (when no stock available)
4. **Hidden:** Not visible to callers/delivery persons

### Dialog States:
1. **Loading:** Shows spinner on submit button
2. **Error:** Toast notification with error message
3. **Success:** Toast notification, dialog closes, data refreshes

### Form Validation Visual Feedback:
- **Empty Product:** "Veuillez sélectionner un produit"
- **Invalid Quantity:** "Veuillez entrer une quantité valide"
- **Quantity > Stock:** "Quantité supérieure au stock disponible"
- **Empty Reason:** "Le motif du retrait est obligatoire"

## Color Scheme

### Button:
- Primary: Outline variant (border + transparent background)
- Icon: Default foreground color
- Hover: Subtle background overlay

### Dialog:
- Title: Warning color (amber/yellow) for icon
- Submit Button: Destructive variant (red) to emphasize withdrawal action
- Cancel Button: Outline variant
- Description: Muted foreground color

### Notification:
- Icon: Warning/Alert color
- Badge: Primary color for unread indicator
- Background: Card/secondary background
- Text: Default foreground

## Accessibility Features

1. **Labels:** All form fields have associated labels
2. **Placeholders:** Helpful examples provided
3. **Aria-labels:** Button and dialog properly labeled
4. **Keyboard Navigation:** Tab through all interactive elements
5. **Screen Reader:** Dialog title announces action
6. **Focus Management:** Auto-focus on first field when dialog opens
7. **Error Messages:** Clear, actionable error text

## Integration Points

### Data Flow:
```
UI Component (ManualWithdrawalDialog)
    ↓
React Query Mutation (useMutation)
    ↓
Supabase RPC Call (manual_withdrawal_from_delivery)
    ↓
Database Transaction:
    - delivery_person_stock UPDATE (decrease)
    - products UPDATE (increase)
    - stock_movements INSERT (log)
    ↓
Real-time Channel (stock-movements-delivery)
    ↓
Notification Context (useNotifications)
    ↓
Notification Bell Component
```

### Query Invalidation:
After successful withdrawal, the following queries are invalidated to refresh data:
- `all-delivery-stocks`
- `delivery-stock-[id]`
- `products-for-transfer`
- `stock-products`
- `stock-overview`

## Success Criteria

✅ **Visual Integration:**
- Button appears in correct location
- Dialog opens and closes smoothly
- Form fields are clearly labeled
- Responsive on all screen sizes

✅ **User Experience:**
- Clear call-to-action
- Helpful placeholder text
- Real-time validation feedback
- Success/error messages appear
- Data refreshes automatically

✅ **Accessibility:**
- Keyboard navigable
- Screen reader compatible
- Clear focus indicators
- Color contrast meets WCAG standards

## Screenshots

### Before Implementation:
```
Stock Livreurs Tab showed only:
- Delivery person name
- Product list with quantities
- No withdrawal action
```

### After Implementation:
```
Stock Livreurs Tab now shows:
- Delivery person name with "Retrait Manuel" button
- Product list with quantities
- Click button → Dialog opens
- Fill form → Submit → Success
- Delivery person receives notification
```

## Technical Notes

- **Component Location:** `src/components/supervisor/ManualWithdrawalDialog.tsx`
- **Integration:** `src/components/supervisor/StockTransferManager.tsx`
- **Notifications:** `src/hooks/useNotifications.tsx`
- **Backend:** `supabase/migrations/20260201220000_manual_withdrawal_from_delivery.sql`
- **Bundle Size Impact:** Minimal (~8KB component + reused dependencies)
- **Performance:** Real-time updates, no page reload required

## Future UI Enhancements

1. **Confirmation Step:** Add "Are you sure?" dialog for large withdrawals
2. **Batch Withdrawal:** Multi-select products for single withdrawal
3. **History Link:** Direct link from notification to stock history
4. **Photo Upload:** Attach evidence/photos to withdrawal reason
5. **Templates:** Save common withdrawal reasons as templates
6. **Preview:** Show impact on both stocks before confirming
