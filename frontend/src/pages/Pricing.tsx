import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

const plans = [
  {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      '1 video per month',
      '100 comments per video',
      '2 AI questions per month',
    ],
    cta: 'Start Free',
    color: 'free',
  },
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 19,
    yearlyPrice: 15,
    features: [
      '10 videos per month',
      '1,500 comments per video',
      '30 AI questions per month',
    ],
    cta: 'Get Started',
    color: 'starter',
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 39,
    yearlyPrice: 31,
    features: [
      '20 videos per month',
      '3,000 comments per video',
      '75 AI questions per month',
      'Priority support',
    ],
    cta: 'Upgrade Now',
    color: 'pro',
    popular: true,
  },
  {
    id: 'business',
    name: 'Business',
    monthlyPrice: 79,
    yearlyPrice: 63,
    features: [
      '50 videos per month',
      '10,000 comments per video',
      'Unlimited AI questions',
      'Priority support',
      'Custom integrations',
    ],
    cta: 'Contact Sales',
    color: 'business',
  },
];

const faqs = [
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards (Visa, MasterCard, American Express) and PayPal. For Business plans, we also offer invoice billing.',
  },
  {
    question: 'Can I change plans later?',
    answer: "Yes! You can upgrade or downgrade your plan at any time. When upgrading, you'll be charged the prorated difference. When downgrading, the new rate will apply at your next billing cycle.",
  },
  {
    question: 'What happens if I exceed my limits?',
    answer: "If you exceed your monthly limits, you won't be able to analyze new videos or ask new AI questions until your limits reset. You can always upgrade to a higher plan for more capacity.",
  },
  {
    question: 'Is there a free trial for paid plans?',
    answer: 'We offer a 14-day free trial for our Pro plan. No credit card required. You can explore all Pro features before committing.',
  },
];

const Pricing = () => {
  const [isAnnual, setIsAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🔥</span>
            <span className="font-logo text-xl font-medium tracking-tight">Lently</span>
          </Link>
          <Link to="/login">
            <Button variant="outline" className="btn-secondary">
              Sign In
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-16">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Choose the plan that fits your needs
          </p>

          {/* Toggle */}
          <div className="inline-flex items-center gap-4 p-1 bg-secondary rounded-full">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                !isAnnual ? 'bg-card shadow-sm' : 'text-muted-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                isAnnual ? 'bg-card shadow-sm' : 'text-muted-foreground'
              }`}
            >
              Annual
              <span className="ml-2 text-xs text-success font-normal">Save 20%</span>
            </button>
          </div>
        </motion.div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-24">
          {plans.map((plan, index) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isAnnual={isAnnual}
              index={index}
            />
          ))}
        </div>

        {/* FAQs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-3xl font-bold text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="max-w-2xl mx-auto space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="card-premium p-0 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-secondary/50 transition-colors"
                >
                  <span className="font-medium">{faq.question}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-muted-foreground transition-transform ${
                      openFaq === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaq === index && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="px-5 pb-5"
                  >
                    <p className="text-muted-foreground">{faq.answer}</p>
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
};

interface PlanCardProps {
  plan: typeof plans[0];
  isAnnual: boolean;
  index: number;
}

const PlanCard = ({ plan, isAnnual, index }: PlanCardProps) => {
  const price = isAnnual ? plan.yearlyPrice : plan.monthlyPrice;
  
  const colorClasses: Record<string, { badge: string; button: string }> = {
    free: {
      badge: 'bg-plan-free-bg text-plan-free-text',
      button: 'btn-secondary',
    },
    starter: {
      badge: 'bg-plan-starter-bg text-plan-starter-text',
      button: 'bg-plan-starter-text text-white hover:opacity-90',
    },
    pro: {
      badge: 'bg-plan-pro-bg text-plan-pro-text',
      button: 'bg-plan-pro-text text-white hover:opacity-90',
    },
    business: {
      badge: 'bg-plan-business-bg text-plan-business-text',
      button: 'bg-plan-business-text text-white hover:opacity-90',
    },
  };

  const colors = colorClasses[plan.color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -4 }}
      className={`card-premium relative ${plan.popular ? 'ring-2 ring-plan-pro-text' : ''}`}
    >
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-plan-pro-text text-white text-xs font-medium rounded-full">
          MOST POPULAR
        </div>
      )}

      <div className={`inline-block px-3 py-1 text-xs font-medium rounded-full mb-4 ${colors.badge}`}>
        {plan.name.toUpperCase()}
      </div>

      <div className="mb-6">
        <span className="text-4xl font-bold">${price}</span>
        <span className="text-muted-foreground">/month</span>
      </div>

      <div className="space-y-3 mb-8">
        {plan.features.map((feature) => (
          <div key={feature} className="flex items-center gap-2 text-sm">
            <Check className="w-4 h-4 text-success" />
            <span>{feature}</span>
          </div>
        ))}
      </div>

      <Button className={`w-full ${colors.button}`}>
        {plan.cta}
      </Button>
    </motion.div>
  );
};

export default Pricing;
