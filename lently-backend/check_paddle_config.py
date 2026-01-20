"""
Quick test to verify Paddle configuration for all plans
"""

from src.billing.schemas import PLANS, PlanId

print("=" * 60)
print("PADDLE CONFIGURATION CHECK")
print("=" * 60)

for plan_id, plan in PLANS.items():
    print(f"\n📋 {plan.name} Plan (ID: {plan.id})")
    print(f"   Price: ${plan.price_monthly/100:.2f}/month")
    print(f"   Monthly Price ID: {plan.paddle_price_id_monthly or '❌ NOT SET'}")
    print(f"   Yearly Price ID: {plan.paddle_price_id_yearly or '❌ NOT SET'}")
    
    if plan.id != PlanId.FREE and not plan.paddle_price_id_monthly:
        print(f"   ⚠️  WARNING: No monthly price ID configured!")

print("\n" + "=" * 60)
print("Checking Pro plan specifically...")
print("=" * 60)

pro_plan = PLANS[PlanId.PRO]
print(f"Pro Plan Monthly Price ID: {pro_plan.paddle_price_id_monthly}")
print(f"Length: {len(pro_plan.paddle_price_id_monthly) if pro_plan.paddle_price_id_monthly else 0}")
print(f"Type: {type(pro_plan.paddle_price_id_monthly)}")
print(f"Is None: {pro_plan.paddle_price_id_monthly is None}")
print(f"Is Empty: {not pro_plan.paddle_price_id_monthly}")

if pro_plan.paddle_price_id_monthly:
    print(f"✅ Pro plan has a price ID configured")
else:
    print(f"❌ Pro plan price ID is missing or invalid!")
