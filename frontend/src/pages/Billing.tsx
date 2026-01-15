import { motion } from 'framer-motion';
import { Check, Sparkles, Video, MessageSquare, FileText } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { currentUser, getPlanBadgeClass } from '@/data/users';

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: 12,
    features: [
      '20 videos per month',
      '5,000 comments per video',
      '60 AI questions',
    ],
    color: 'starter',
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 27,
    features: [
      '50 videos per month',
      '10,000 comments per video',
      '150 AI questions',
      'Priority support',
    ],
    color: 'pro',
    popular: true,
  },
  {
    id: 'business',
    name: 'Business',
    price: 58,
    features: [
      '100 videos per month',
      '50,000 comments per video',
      'Unlimited AI questions',
      'Priority support',
      'Custom integrations',
    ],
    color: 'business',
    popular: false,
  },
];

const Billing = () => {
  const user = currentUser;

  const usageStats = [
    {
      icon: Video,
      label: 'Videos Analyzed',
      used: user.usage.videosAnalyzed,
      limit: user.usage.videosLimit,
      color: 'text-primary',
    },
    {
      icon: MessageSquare,
      label: 'AI Questions',
      used: user.usage.aiQuestions,
      limit: user.usage.aiQuestionsLimit,
      color: 'text-primary',
    },
    {
      icon: FileText,
      label: 'Comments Analyzed',
      used: user.usage.commentsAnalyzed,
      limit: user.usage.commentsLimit,
      color: 'text-primary',
    },
  ];

  return (
    <MainLayout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-10"
      >
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>

        {/* Current Plan Card */}
        <section className="card-elevated">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-xl font-semibold">Current Plan:</h2>
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${getPlanBadgeClass(user.plan)}`}>
              {user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}
            </span>
          </div>

          <div className="space-y-2 mb-6">
            <FeatureItem>3 videos per month</FeatureItem>
            <FeatureItem>100 comments per video</FeatureItem>
            <FeatureItem>3 AI questions per month</FeatureItem>
          </div>

          <Button className="btn-primary flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Upgrade to get more →
          </Button>
        </section>

        {/* Usage Statistics */}
        <section>
          <h2 className="text-xl font-semibold mb-6">Current Usage</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {usageStats.map((stat, index) => {
              const percentage = Math.min((stat.used / stat.limit) * 100, 100);
              const isOverLimit = stat.used > stat.limit;
              
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="card-premium"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center ${stat.color}`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
                  </div>
                  
                  <div className="text-3xl font-bold mb-3">
                    {stat.used}
                    <span className="text-lg text-muted-foreground font-normal">/{stat.limit}</span>
                  </div>
                  
                  <div className="progress-bar">
                    <motion.div
                      className={`progress-fill ${isOverLimit ? 'bg-destructive' : ''}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(percentage, 100)}%` }}
                      transition={{ duration: 0.8, delay: index * 0.1 }}
                    />
                  </div>
                  
                  {isOverLimit && (
                    <p className="text-xs text-destructive mt-2">Over limit</p>
                  )}
                </motion.div>
              );
            })}
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Resets on: {new Date(user.usage.resetDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </section>

        {/* Available Plans */}
        <section>
          <h2 className="text-xl font-semibold mb-6">Available Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan, index) => (
              <PlanCard key={plan.id} plan={plan} index={index} />
            ))}
          </div>
        </section>

        {/* Payment Method */}
        <section className="card-premium">
          <h2 className="text-xl font-semibold mb-4">Payment Method</h2>
          <p className="text-muted-foreground">No payment method on file</p>
          <Button variant="outline" className="btn-secondary mt-4">
            Add Payment Method
          </Button>
        </section>

        {/* Billing History */}
        <section className="card-premium">
          <h2 className="text-xl font-semibold mb-4">Billing History</h2>
          <p className="text-muted-foreground">No invoices yet</p>
        </section>
      </motion.div>
    </MainLayout>
  );
};

const FeatureItem = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-2 text-sm">
    <Check className="w-4 h-4 text-success" />
    <span>{children}</span>
  </div>
);

interface PlanCardProps {
  plan: typeof plans[0];
  index: number;
}

const PlanCard = ({ plan, index }: PlanCardProps) => {
  const colorClasses: Record<string, { bg: string; text: string; button: string }> = {
    starter: {
      bg: 'bg-plan-starter-bg',
      text: 'text-plan-starter-text',
      button: 'bg-plan-starter-text text-white hover:opacity-90',
    },
    pro: {
      bg: 'bg-plan-pro-bg',
      text: 'text-plan-pro-text',
      button: 'bg-plan-pro-text text-white hover:opacity-90',
    },
    business: {
      bg: 'bg-plan-business-bg',
      text: 'text-plan-business-text',
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

      <div className={`inline-block px-3 py-1 text-xs font-medium rounded-full mb-4 ${colors.bg} ${colors.text}`}>
        {plan.name.toUpperCase()}
      </div>

      <div className="mb-6">
        <span className="text-4xl font-bold">${plan.price}</span>
        <span className="text-muted-foreground">/month</span>
      </div>

      <div className="space-y-3 mb-8">
        {plan.features.map((feature) => (
          <FeatureItem key={feature}>{feature}</FeatureItem>
        ))}
      </div>

      <Button className={`w-full ${colors.button}`}>
        Select Plan
      </Button>
    </motion.div>
  );
};

export default Billing;
