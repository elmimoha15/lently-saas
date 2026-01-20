## ⚠️ Paddle Checkout Error Diagnosis

Based on the logs, the Pro plan checkout is **failing at Paddle's end** with a 400 Bad Request error.

### What's Working ✅
- Frontend is correctly configured
- Backend is returning the correct price_id: `pri_01kf39v5bm1lr0jbbxa911px27`
- Paddle.js is loaded and initialized
- The checkout configuration is correct

### The Problem ❌
```
POST https://sandbox-checkout-service.paddle.com/transaction-checkout 400 (Bad Request)
Event: checkout.error
```

This means **Paddle rejected the checkout request**. The most common causes are:

### Root Causes (In Order of Likelihood):

1. **❌ Price ID doesn't exist in Paddle Sandbox**
   - The price_id `pri_01kf39v5bm1lr0jbbxa911px27` might not exist in your Paddle account
   - Or it exists in production but not sandbox (or vice versa)

2. **❌ Price ID is archived/disabled in Paddle**
   - The price might have been deleted or disabled

3. **❌ Wrong Paddle environment**
   - Currently using: `sandbox`
   - The price_id might be for the `production` environment

4. **❌ Product/Price configuration issue**
   - The price might not be properly linked to a product
   - The product might be inactive

### How to Fix:

#### Step 1: Verify the Price ID in Paddle Dashboard
1. Go to https://sandbox-vendors.paddle.com/ (for sandbox)
2. Navigate to **Catalog → Prices**
3. Search for price ID: `pri_01kf39v5bm1lr0jbbxa911px27`
4. Check if it exists and is active

#### Step 2: If Price Doesn't Exist
You need to create prices in Paddle for each plan:

**In Paddle Dashboard:**
1. Go to Catalog → Products
2. Create/find your Lently product
3. Create a price for the Pro plan ($39/month)
4. Copy the new price ID
5. Update `lently-backend/src/billing/schemas.py`:

```python
PlanId.PRO: Plan(
    # ...
    paddle_price_id_monthly="pri_YOUR_NEW_PRICE_ID",  # ← Update this
    # ...
),
```

#### Step 3: Compare with Working Plans
The **Starter plan works**, so compare its setup:
- Starter price_id: `pri_01kf39teej9gdfagqayr5sfg9n`
- Check why this one works but Pro doesn't

### Quick Test Commands:

**1. Check what Paddle returns for the error:**
```bash
# Look for the full error event in console
# It should show error_message or error_code
```

**2. Verify all price IDs in backend:**
```bash
grep -r "paddle_price_id" lently-backend/src/billing/schemas.py
```

**3. Test with Starter plan (working):**
- If Starter works, copy its price_id temporarily to Pro to test if Pro's ID is the issue

### Expected Paddle Event for Errors:
```javascript
{
  name: "checkout.error",
  data: {
    error_code: "...",
    error_message: "Price not found" // or similar
  }
}
```

### Next Steps:
1. Check the browser console for the **full error event** (should have more details now)
2. Verify the price_id exists in your Paddle **sandbox** account
3. If it doesn't exist, create it in Paddle and update the backend config
4. If you're ready for production, switch to production mode and use production price IDs

---

**TL;DR:** The price_id for Pro plan doesn't exist (or is invalid) in your Paddle sandbox account. You need to create the price in Paddle's dashboard and update the price_id in your backend configuration.
