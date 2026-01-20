# Paddle Invoice Email Configuration Guide

## 🎯 **IMPORTANT: Sandbox Email Routing (This is Why You're Not Seeing Emails!)**

### **Paddle DOES send invoice emails in sandbox, but with special routing rules:**

#### **How Sandbox Email Delivery Works:**

In Paddle Sandbox, invoice emails are **automatically sent** for completed transactions, BUT:

1. **Emails only go directly to addresses on the SAME DOMAIN as your main Paddle account email**
2. **Different domains are FORWARDED to your main Paddle account email**
3. **Free email domains (Gmail, Yahoo, etc.) ONLY go to your main Paddle account email**

#### **Example (if your main Paddle account is `you@yourcompany.com`):**

| Customer Email Used in Checkout | Where Invoice Email Actually Goes |
|--------------------------------|-----------------------------------|
| `dev@yourcompany.com` | ✅ Sent directly to `dev@yourcompany.com` |
| `test@yourcompany.com` | ✅ Sent directly to `test@yourcompany.com` |
| `customer@example.com` | 📧 **Forwarded to** `you@yourcompany.com` |
| `elmimoha15@gmail.com` | 📧 **Forwarded to** `you@yourcompany.com` |
| `test@test.com` | 📧 **Forwarded to** `you@yourcompany.com` |

### **What This Means for You:**

✅ **Invoice emails ARE being sent** - Paddle sends them automatically  
✅ **Your test customers won't receive them directly** - they're forwarded to YOUR inbox  
✅ **Check the email inbox of your main Paddle sandbox account** - that's where all test invoices go  
✅ **In production (live mode), customers WILL receive invoices directly at their email**

---

## What Emails Paddle Sends Automatically

### **On Subscription Creation (First Payment):**
1. **Receipt** - "Your receipt from [Company]" with PDF invoice
2. **Subscription Confirmation** - "Welcome to [Company]" with renewal info
3. **Payment Details Saved** - Confirmation of payment method

### **On Subscription Renewal:**
1. **Receipt** - "Your receipt from [Company]" with PDF invoice

### **No Configuration Needed:**
These emails are sent **automatically** by Paddle. You don't need to enable anything special.

---

## How to Test Invoice Emails in Sandbox

### **Option 1: Check Your Main Paddle Account Email (Easiest)**
1. Find out what email your Paddle sandbox account uses
2. Complete a test transaction with ANY customer email
3. Check that email inbox - all invoices will be forwarded there

### **Option 2: Use Same Domain Emails**
1. If your Paddle account is `you@yourcompany.com`
2. Use test customer emails like `test@yourcompany.com`, `dev@yourcompany.com`
3. These will receive invoices directly (great for testing the actual email experience)

### **Option 3: Use Paddle's Email Testing**
1. Go to Paddle Dashboard → **Developer Tools** → **Notifications**
2. Set up email notification destinations
3. Subscribe to events like `transaction.completed`, `subscription.created`
4. Use an email on your domain to receive notifications

---

## Quick Test Steps

1. **Find your main Paddle sandbox account email:**
   - Log into https://sandbox-vendors.paddle.com/
   - Go to **Settings** → **Account** to see the main email

2. **Complete a test checkout:**
   - Use test card: `4242 4242 4242 4242`
   - Use ANY customer email (even `test@example.com`)
   - Complete the payment

3. **Check your main Paddle account email inbox:**
   - You should receive the invoice email there
   - It will have the PDF invoice attached or linked
   - This confirms invoices are working

4. **Check your app's billing history:**
   - Go to your app's Billing page
   - Click on the transaction
   - Download the invoice PDF
   - This confirms webhook storage is working

---

## Verifying Transactions are Stored

### In Paddle Dashboard:
1. Log into https://sandbox-vendors.paddle.com/
2. Go to **Transactions**
3. You should see all completed test transactions

### In Your Backend Logs:
```bash
# After restarting backend, look for:
📧 Transaction completed: txn_xxx
📧 Receipt data: {...}
✅ Stored transaction txn_xxx for user xxx
```

### In Firestore:
```
users/{userId}/billing/transactions/history/{transactionId}
```
Should contain:
- `invoice_pdf_url` - Link to PDF invoice
- `invoice_number` - Invoice number
- `status: "completed"`
- `receipt_data` - Full receipt data from Paddle

---

## When You Go Live (Production)

Once you switch from sandbox to live mode:

1. **Customers WILL receive invoice emails directly**
   - No more forwarding rules
   - Emails go to the actual customer email used in checkout

2. **Update your backend:**
   - Change Paddle API keys from sandbox to live
   - Update price IDs in `schemas.py` to live price IDs
   - Update webhook URL to production backend

3. **Verify business settings:**
   - Go to **Settings** → **Business information**
   - Ensure company name, address, tax info is correct
   - This appears on customer invoices

---

## Current Status

Based on your screenshot, Paddle IS recording transactions:
- ✅ 8 completed transactions showing
- ✅ Dates: Jan 17-20, 2026
- ✅ Amounts: $12, $30, $60
- ✅ Customer emails: elmimoha15@gmail.com, elmimoha56@gmail.com

**This means:**
1. ✅ Payments are processing correctly
2. ✅ Paddle is generating invoices
3. 📧 Invoice emails are being sent to YOUR main Paddle account email (not the test customer emails)

**To find the invoices:**
- Check the email inbox of your main Paddle sandbox account
- Or click on any transaction in Paddle dashboard and download the invoice
- Or wait for webhooks to store them (check backend logs after restart)

---

## Summary

**For Development (Sandbox):**
- ✅ Invoices ARE automatically sent by Paddle
- ✅ Check YOUR main Paddle account email inbox
- ✅ Test customers won't receive emails directly (by design)

**For Production (Live):**
- ✅ Customers will receive invoice emails directly
- ✅ No configuration needed - it's automatic
- ✅ Just switch to live mode and update API keys
