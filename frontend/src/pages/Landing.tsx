import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Play,
  Sparkles,
  TrendingUp,
  Users,
  MessageSquare,
  Brain,
  Lightbulb,
  Heart,
  Shield,
  Check,
  ChevronDown,
  Youtube,
  BarChart3,
  Target,
  Clock,
  Quote,
  Zap,
  Star,
  ArrowUpRight,
} from 'lucide-react';

// Import landing page components
import { Navigation } from '../components/landing/Navigation';
import { HeroSection } from '../components/landing/HeroSection';
import { CarouselSection } from '../components/landing/CarouselSection';
import { FadeIn } from '../components/landing/FadeIn';
import { typography, colors } from '../components/landing/constants';

// ============================================================================
// Data
// ============================================================================

const features = [
  {
    eyebrow: 'AI That Thinks Like a Strategist',
    title: 'Ask anything about your audience',
    description: 'Natural language interface to your comment data. Ask complex questions, get instant answers backed by real audience feedback. No SQL, no exports, just conversation.',
    icon: Brain,
    visual: 'ask-ai',
  },
  {
    eyebrow: 'Pattern Recognition at Scale',
    title: 'Sentiment decoded in seconds',
    description: 'Every comment analyzed for emotional context, topic relevance, and actionable signals. See what your audience truly feels—not just what they say.',
    icon: Heart,
    visual: 'sentiment',
  },
  {
    eyebrow: 'Data-Driven Creativity',
    title: 'Content ideas from real demand',
    description: 'Stop guessing what to create next. Get video ideas backed by actual audience requests, questions, and interests expressed in their own words.',
    icon: Lightbulb,
    visual: 'ideas',
  },
];

const pricingPlans = [
  {
    name: 'Free',
    price: 0,
    period: '/mo',
    description: 'Perfect for trying Lently',
    features: [
      '1 video analysis per month',
      'Up to 100 comments',
      '2 AI questions',
      'Basic sentiment analysis',
    ],
    cta: 'Start Free',
    featured: false,
  },
  {
    name: 'Starter',
    price: 19,
    period: '/mo',
    description: 'For growing creators',
    features: [
      '10 videos per month',
      'Up to 1,000 comments each',
      '30 AI questions',
      'Full sentiment breakdown',
      'Content ideas',
    ],
    cta: 'Get Started',
    featured: false,
  },
  {
    name: 'Pro',
    price: 39,
    period: '/mo',
    description: 'For serious creators',
    features: [
      '20 videos per month',
      'Up to 3,000 comments each',
      '75 AI questions',
      'Advanced analytics',
      'Superfan detection',
      'Priority support',
    ],
    cta: 'Go Pro',
    featured: true,
  },
  {
    name: 'Business',
    price: 79,
    period: '/mo',
    description: 'For teams & agencies',
    features: [
      '50 videos per month',
      'Up to 10,000 comments each',
      'Unlimited AI questions',
      'Team collaboration',
      'API access',
      'Dedicated support',
    ],
    cta: 'Contact Sales',
    featured: false,
  },
];

const faqs = [
  {
    q: 'How does Lently analyze comments?',
    a: 'We use advanced AI models to read and understand every comment on your videos. Our system categorizes sentiment, identifies topics, surfaces questions, and extracts actionable insights—all in seconds.',
  },
  {
    q: 'Is my data secure?',
    a: 'Absolutely. We use enterprise-grade encryption and never store your YouTube credentials. Your data is processed securely and never shared with third parties.',
  },
  {
    q: 'Can I analyze any YouTube video?',
    a: 'You can analyze any public YouTube video. Just paste the URL and our AI handles the rest. No authentication required for public content.',
  },
  {
    q: 'What makes Ask AI different?',
    a: 'Unlike basic analytics, Ask AI lets you have a conversation with your data. Ask complex questions in plain English and get nuanced answers backed by actual comments.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes, all plans are month-to-month with no long-term commitments. Cancel anytime from your dashboard—no questions asked.',
  },
  {
    q: 'Do you offer refunds?',
    a: 'We offer a 14-day money-back guarantee on all paid plans. If Lently isn\'t right for you, we\'ll refund your payment in full.',
  },
];

// ============================================================================
// Hero Visual Component - Real UI Mockup
// ============================================================================

const HeroVisual = () => {
  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: 20, rotate: 2 }}
      animate={{ opacity: 1, y: 0, rotate: 2 }}
      transition={{ duration: 1, delay: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* Main Card */}
      <div
        className="relative rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #FFFFFF 0%, #FAFAF9 100%)',
          boxShadow: '0 40px 80px -20px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
          transform: 'perspective(1000px) rotateY(-2deg)',
        }}
      >
        {/* Header Bar */}
        <div className="px-6 py-4 border-b" style={{ borderColor: colors.neutral[200] }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full" style={{ background: colors.red[500] }} />
              <div className="w-3 h-3 rounded-full" style={{ background: colors.amber[500] }} />
              <div className="w-3 h-3 rounded-full" style={{ background: colors.emerald[500] }} />
            </div>
            <span
              className="text-xs"
              style={{ ...typography.mono, color: colors.neutral[400] }}
            >
              lently.app
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Analysis Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ ...typography.body, color: colors.neutral[500] }}>
                Analyzing
              </p>
              <p className="text-lg font-semibold" style={{ ...typography.display, color: colors.neutral[900] }}>
                "10 Habits of Successful..."
              </p>
            </div>
            <div
              className="px-3 py-1.5 rounded-full text-xs"
              style={{
                ...typography.mono,
                background: colors.emerald[100],
                color: colors.emerald[600],
              }}
            >
              Complete
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Comments', value: '2,847', change: '+12%' },
              { label: 'Positive', value: '78%', change: '+5%' },
              { label: 'Questions', value: '142', change: 'New' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="p-4 rounded-2xl"
                style={{ background: colors.neutral[50] }}
              >
                <p className="text-xs mb-1" style={{ ...typography.body, color: colors.neutral[500] }}>
                  {stat.label}
                </p>
                <p className="text-2xl font-bold" style={{ ...typography.display, color: colors.neutral[900] }}>
                  {stat.value}
                </p>
                <p className="text-xs mt-1" style={{ ...typography.mono, color: colors.emerald[600] }}>
                  {stat.change}
                </p>
              </div>
            ))}
          </div>

          {/* AI Insight */}
          <div
            className="p-4 rounded-2xl"
            style={{
              background: `linear-gradient(135deg, ${colors.red[50]} 0%, #FFF 100%)`,
              border: `1px solid ${colors.red[100]}`,
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: colors.red[500] }}
              >
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium mb-1" style={{ ...typography.display, color: colors.neutral[900] }}>
                  AI Insight
                </p>
                <p className="text-sm leading-relaxed" style={{ ...typography.body, color: colors.neutral[600] }}>
                  Your audience is asking for a follow-up on productivity tools.
                  <span style={{ color: colors.red[600] }}> 23 comments</span> mention this directly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Elements */}
      <motion.div
        className="absolute -top-6 -left-6 px-4 py-2 rounded-xl"
        style={{
          background: 'white',
          boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)',
          border: `1px solid ${colors.neutral[100]}`,
        }}
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" style={{ color: colors.emerald[500] }} />
          <span className="text-sm font-medium" style={typography.display}>
            +47% engagement
          </span>
        </div>
      </motion.div>

      <motion.div
        className="absolute -bottom-4 -right-4 px-4 py-2 rounded-xl"
        style={{
          background: colors.neutral[900],
          boxShadow: '0 20px 40px -10px rgba(0,0,0,0.3)',
        }}
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      >
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-white" />
          <span className="text-sm font-medium text-white" style={typography.display}>
            Ask AI anything
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============================================================================
// Feature Visual Components
// ============================================================================

const FeatureVisual = ({ type }: { type: string }) => {
  const visuals: Record<string, React.ReactNode> = {
    'ask-ai': (
      <div className="space-y-4">
        <div
          className="p-4 rounded-2xl"
          style={{ background: colors.neutral[100] }}
        >
          <p className="text-sm" style={{ ...typography.body, color: colors.neutral[500] }}>
            Your question
          </p>
          <p className="text-lg mt-2" style={{ ...typography.display, color: colors.neutral[900] }}>
            "What topics should I cover next?"
          </p>
        </div>
        <div
          className="p-4 rounded-2xl"
          style={{
            background: `linear-gradient(135deg, ${colors.red[50]} 0%, white 100%)`,
            border: `1px solid ${colors.red[100]}`,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4" style={{ color: colors.red[500] }} />
            <span className="text-sm font-medium" style={{ ...typography.display, color: colors.red[600] }}>
              AI Response
            </span>
          </div>
          <p className="text-sm leading-relaxed" style={{ ...typography.body, color: colors.neutral[700] }}>
            Based on 847 comments, your audience wants: <strong>1)</strong> Advanced tutorials, <strong>2)</strong> Behind-the-scenes content, <strong>3)</strong> Q&A sessions...
          </p>
        </div>
      </div>
    ),
    'sentiment': (
      <div className="space-y-3">
        {[
          { label: 'Positive', value: 72, color: colors.emerald[500] },
          { label: 'Neutral', value: 21, color: colors.neutral[400] },
          { label: 'Negative', value: 7, color: colors.red[500] },
        ].map((item) => (
          <div key={item.label}>
            <div className="flex justify-between text-sm mb-2">
              <span style={{ ...typography.body, color: colors.neutral[600] }}>{item.label}</span>
              <span style={{ ...typography.mono, color: colors.neutral[900] }}>{item.value}%</span>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: colors.neutral[100] }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: item.color }}
                initial={{ width: 0 }}
                whileInView={{ width: `${item.value}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.3 }}
              />
            </div>
          </div>
        ))}
      </div>
    ),
    'ideas': (
      <div className="space-y-3">
        {[
          { idea: 'Deep dive: Productivity systems', mentions: 23, icon: '📊' },
          { idea: 'Beginner-friendly tutorial series', mentions: 18, icon: '🎓' },
          { idea: 'Day in the life vlog', mentions: 14, icon: '📹' },
        ].map((item) => (
          <div
            key={item.idea}
            className="flex items-center gap-4 p-4 rounded-xl"
            style={{
              background: colors.neutral[50],
              border: `1px solid ${colors.neutral[100]}`,
            }}
          >
            <span className="text-2xl">{item.icon}</span>
            <div className="flex-1">
              <p className="font-medium" style={{ ...typography.display, color: colors.neutral[900] }}>
                {item.idea}
              </p>
              <p className="text-sm mt-1" style={{ ...typography.body, color: colors.neutral[500] }}>
                Mentioned {item.mentions} times
              </p>
            </div>
            <ArrowUpRight className="w-5 h-5" style={{ color: colors.neutral[400] }} />
          </div>
        ))}
      </div>
    ),
  };

  return (
    <div
      className="p-6 rounded-3xl"
      style={{
        background: 'white',
        boxShadow: '0 40px 80px -20px rgba(0,0,0,0.1)',
        border: `1px solid ${colors.neutral[100]}`,
      }}
    >
      {visuals[type]}
    </div>
  );
};

// ============================================================================
// Main Landing Component
// ============================================================================

const Landing = () => {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="min-h-screen"
      style={{
        background: '#FFFCFC', // Warm white
        color: colors.neutral[900],
      }}
    >
      {/* Background Gradient */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at 20% 30%, rgba(239,68,68,0.03), transparent 60%),
            radial-gradient(circle at 80% 70%, rgba(239,68,68,0.02), transparent 50%)
          `,
        }}
      />

      <Navigation />
      <HeroSection heroRef={heroRef} />
      <CarouselSection />

      {/* ================================================================== */}
      {/* PROBLEM SECTION - Full Width Statement */}
      {/* ================================================================== */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <span
              className="text-xs uppercase block mb-6"
              style={{
                ...typography.mono,
                letterSpacing: '0.15em',
                color: colors.neutral[400],
              }}
            >
              The Problem
            </span>
          </FadeIn>
          <FadeIn delay={0.1}>
            <h2
              style={{
                ...typography.display,
                fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                maxWidth: '800px',
              }}
            >
              You're sitting on a goldmine of audience feedback.
              <span style={{ color: colors.red[500] }}> But who has time to read 10,000 comments?</span>
            </h2>
          </FadeIn>
        </div>
      </section>

      {/* ================================================================== */}
      {/* FEATURES - Alternating Editorial Layout */}
      {/* ================================================================== */}
      <section id="features" className="py-20 lg:py-32" style={{ background: colors.neutral[50] }}>
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn className="mb-24">
            <span
              className="text-xs uppercase block mb-6"
              style={{
                ...typography.mono,
                letterSpacing: '0.15em',
                color: colors.neutral[400],
              }}
            >
              Capabilities
            </span>
            <h2
              style={{
                ...typography.display,
                fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
              }}
            >
              Everything you need to
              <br />
              <span style={{ color: colors.red[500] }}>understand your audience</span>
            </h2>
          </FadeIn>

          {/* Feature 1 - Left Heavy (6/6) */}
          <div className="mb-20 lg:mb-28">
            <div
              className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center py-16 px-8 lg:px-16 rounded-3xl"
              style={{
                background: `linear-gradient(90deg, rgba(254,242,242,0.8) 0%, transparent 60%)`,
              }}
            >
              <FadeIn className="lg:col-span-6" direction="left">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-8"
                  style={{ background: colors.red[100] }}
                >
                  <Brain className="w-7 h-7" style={{ color: colors.red[500] }} />
                </div>
                <span
                  className="text-xs uppercase block mb-4"
                  style={{
                    ...typography.mono,
                    letterSpacing: '0.1em',
                    color: colors.red[500],
                  }}
                >
                  {features[0].eyebrow}
                </span>
                <h3
                  style={{
                    ...typography.display,
                    fontSize: '2.25rem',
                    lineHeight: 1.15,
                    fontWeight: 600,
                    marginBottom: '1.5rem',
                  }}
                >
                  {features[0].title}
                </h3>
                <p
                  style={{
                    ...typography.body,
                    fontSize: '1.125rem',
                    lineHeight: 1.7,
                    color: colors.neutral[600],
                    maxWidth: '480px',
                  }}
                >
                  {features[0].description}
                </p>
                <motion.button
                  className="mt-8 inline-flex items-center gap-2 text-sm"
                  style={{ ...typography.display, fontWeight: 600, color: colors.red[500] }}
                  whileHover={{ x: 4 }}
                >
                  Try Ask AI <ArrowRight className="w-4 h-4" />
                </motion.button>
              </FadeIn>
              <FadeIn className="lg:col-span-6" direction="right" delay={0.2}>
                <motion.div
                  whileHover={{ scale: 1.02, rotate: 0 }}
                  style={{ transform: 'rotate(2deg)' }}
                >
                  <FeatureVisual type={features[0].visual} />
                </motion.div>
              </FadeIn>
            </div>
          </div>

          {/* Feature 2 - Right Heavy (5/7), reversed */}
          <div className="mb-20 lg:mb-28">
            <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
              <FadeIn className="lg:col-span-5 lg:col-start-1 order-2 lg:order-1" direction="left">
                <motion.div
                  whileHover={{ scale: 1.02, rotate: 0 }}
                  style={{ transform: 'rotate(-1deg)' }}
                >
                  <FeatureVisual type={features[1].visual} />
                </motion.div>
              </FadeIn>
              <FadeIn className="lg:col-span-6 lg:col-start-7 order-1 lg:order-2" direction="right" delay={0.1}>
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-8"
                  style={{ background: colors.emerald[100] }}
                >
                  <Heart className="w-7 h-7" style={{ color: colors.emerald[600] }} />
                </div>
                <span
                  className="text-xs uppercase block mb-4"
                  style={{
                    ...typography.mono,
                    letterSpacing: '0.1em',
                    color: colors.emerald[600],
                  }}
                >
                  {features[1].eyebrow}
                </span>
                <h3
                  style={{
                    ...typography.display,
                    fontSize: '2.25rem',
                    lineHeight: 1.15,
                    fontWeight: 600,
                    marginBottom: '1.5rem',
                  }}
                >
                  {features[1].title}
                </h3>
                <p
                  style={{
                    ...typography.body,
                    fontSize: '1.125rem',
                    lineHeight: 1.7,
                    color: colors.neutral[600],
                    maxWidth: '480px',
                  }}
                >
                  {features[1].description}
                </p>
              </FadeIn>
            </div>
          </div>

          {/* Feature 3 - Full Width Statement + Visual */}
          <div>
            <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
              <FadeIn className="lg:col-span-6" direction="left">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-8"
                  style={{ background: colors.red[100] }}
                >
                  <Lightbulb className="w-7 h-7" style={{ color: colors.red[500] }} />
                </div>
                <span
                  className="text-xs uppercase block mb-4"
                  style={{
                    ...typography.mono,
                    letterSpacing: '0.1em',
                    color: colors.red[500],
                  }}
                >
                  {features[2].eyebrow}
                </span>
                <h3
                  style={{
                    ...typography.display,
                    fontSize: '2.25rem',
                    lineHeight: 1.15,
                    fontWeight: 600,
                    marginBottom: '1.5rem',
                  }}
                >
                  {features[2].title}
                </h3>
                <p
                  style={{
                    ...typography.body,
                    fontSize: '1.125rem',
                    lineHeight: 1.7,
                    color: colors.neutral[600],
                    maxWidth: '480px',
                  }}
                >
                  {features[2].description}
                </p>
              </FadeIn>
              <FadeIn className="lg:col-span-5 lg:col-start-8" direction="right" delay={0.2}>
                <motion.div
                  whileHover={{ scale: 1.02, rotate: 0 }}
                  style={{ transform: 'rotate(1deg)' }}
                >
                  <FeatureVisual type={features[2].visual} />
                </motion.div>
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* HOW IT WORKS - Horizontal Flow */}
      {/* ================================================================== */}
      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn className="text-center mb-20">
            <span
              className="text-xs uppercase block mb-6"
              style={{
                ...typography.mono,
                letterSpacing: '0.15em',
                color: colors.neutral[400],
              }}
            >
              How It Works
            </span>
            <h2
              style={{
                ...typography.display,
                fontSize: 'clamp(2rem, 4vw, 3rem)',
                lineHeight: 1.1,
              }}
            >
              Three steps. Seconds.
            </h2>
          </FadeIn>

          <div className="grid lg:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Paste any video link',
                desc: 'Drop a YouTube URL. Public videos work instantly—no authentication needed.',
                icon: Youtube,
              },
              {
                step: '02',
                title: 'AI reads everything',
                desc: 'Every comment analyzed for sentiment, topics, questions, and opportunities.',
                icon: Brain,
              },
              {
                step: '03',
                title: 'Get instant insights',
                desc: 'Clear breakdown of what\'s working, what to create next, and who to engage.',
                icon: Sparkles,
              },
            ].map((item, i) => (
              <FadeIn key={item.step} delay={i * 0.15}>
                <motion.div
                  className="relative p-8 lg:p-10 rounded-3xl h-full"
                  style={{
                    background: 'white',
                    border: `1px solid ${colors.neutral[100]}`,
                    boxShadow: '0 20px 40px -20px rgba(0,0,0,0.08)',
                  }}
                  whileHover={{ y: -4, boxShadow: '0 30px 60px -20px rgba(0,0,0,0.15)' }}
                >
                  <span
                    className="absolute top-8 right-8 text-6xl font-bold select-none"
                    style={{ ...typography.display, color: colors.neutral[100] }}
                  >
                    {item.step}
                  </span>
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-8"
                    style={{ background: colors.neutral[900] }}
                  >
                    <item.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3
                    className="text-xl mb-4"
                    style={{ ...typography.display, fontWeight: 600 }}
                  >
                    {item.title}
                  </h3>
                  <p
                    style={{
                      ...typography.body,
                      color: colors.neutral[600],
                      lineHeight: 1.6,
                    }}
                  >
                    {item.desc}
                  </p>
                </motion.div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* TESTIMONIAL - Large Quote, Editorial Style */}
      {/* ================================================================== */}
      <section className="py-20 lg:py-32" style={{ background: colors.neutral[50] }}>
        <div className="mx-auto max-w-5xl px-6 lg:px-8 text-center">
          <FadeIn>
            {/* Stars */}
            <div className="flex justify-center gap-1 mb-8">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
              ))}
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            {/* Large Quote Mark */}
            <Quote
              className="w-16 h-16 mx-auto mb-8"
              style={{ color: colors.neutral[200] }}
            />
          </FadeIn>

          <FadeIn delay={0.2}>
            <blockquote
              style={{
                ...typography.serif,
                fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
                lineHeight: 1.4,
                color: colors.neutral[800],
                fontStyle: 'italic',
              }}
            >
              Lently completely changed how I understand my audience.
              I used to spend <span style={{ color: colors.red[500] }}>hours</span> reading comments—
              now I get the full picture in seconds.
            </blockquote>
          </FadeIn>

          <FadeIn delay={0.3}>
            <div className="mt-12 flex items-center justify-center gap-4">
              <div
                className="w-14 h-14 rounded-full"
                style={{
                  background: `linear-gradient(135deg, ${colors.red[500]} 0%, ${colors.red[600]} 100%)`,
                }}
              />
              <div className="text-left">
                <p style={{ ...typography.display, fontWeight: 600 }}>
                  Alex Chen
                </p>
                <p
                  className="text-sm"
                  style={{ ...typography.body, color: colors.neutral[500] }}
                >
                  Tech Creator • 450K subscribers
                </p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ================================================================== */}
      {/* PRICING - Distinct Cards with Scale */}
      {/* ================================================================== */}
      <section id="pricing" className="py-20 lg:py-32" style={{ background: colors.neutral[900] }}>
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn className="text-center mb-20">
            <span
              className="text-xs uppercase block mb-6"
              style={{
                ...typography.mono,
                letterSpacing: '0.15em',
                color: colors.neutral[500],
              }}
            >
              Pricing
            </span>
            <h2
              style={{
                ...typography.display,
                fontSize: 'clamp(2rem, 4vw, 3rem)',
                lineHeight: 1.1,
                color: 'white',
              }}
            >
              Simple, transparent pricing
            </h2>
            <p
              className="mt-6 max-w-lg mx-auto"
              style={{
                ...typography.body,
                color: colors.neutral[400],
                fontSize: '1.125rem',
              }}
            >
              Start free. Upgrade when you're ready.
            </p>
          </FadeIn>

          <div className="grid lg:grid-cols-4 gap-6 items-end">
            {pricingPlans.map((plan, i) => (
              <FadeIn key={plan.name} delay={i * 0.1}>
                <motion.div
                  className={`relative p-8 rounded-3xl h-full ${
                    plan.featured ? 'lg:-mt-8' : ''
                  }`}
                  style={{
                    background: plan.featured
                      ? 'linear-gradient(135deg, #FFFFFF 0%, #FAFAF9 100%)'
                      : 'rgba(255,255,255,0.03)',
                    border: plan.featured
                      ? `2px solid ${colors.red[500]}`
                      : `1px solid rgba(255,255,255,0.08)`,
                    boxShadow: plan.featured
                      ? '0 40px 80px -20px rgba(239,68,68,0.3)'
                      : 'none',
                  }}
                  whileHover={{ y: -8 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  {plan.featured && (
                    <div
                      className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs text-white"
                      style={{
                        ...typography.mono,
                        background: colors.red[500],
                        letterSpacing: '0.1em',
                      }}
                    >
                      MOST POPULAR
                    </div>
                  )}

                  <h3
                    className="mb-2"
                    style={{
                      ...typography.display,
                      fontSize: '1.25rem',
                      fontWeight: 600,
                      color: plan.featured ? colors.neutral[900] : 'white',
                    }}
                  >
                    {plan.name}
                  </h3>
                  <p
                    className="text-sm mb-6"
                    style={{
                      ...typography.body,
                      color: plan.featured ? colors.neutral[500] : colors.neutral[400],
                    }}
                  >
                    {plan.description}
                  </p>

                  <div className="mb-8">
                    <span
                      style={{
                        ...typography.display,
                        fontSize: '4rem',
                        fontWeight: 700,
                        lineHeight: 1,
                        color: plan.featured ? colors.neutral[900] : 'white',
                      }}
                    >
                      ${plan.price}
                    </span>
                    <span
                      className="text-sm"
                      style={{
                        ...typography.body,
                        color: plan.featured ? colors.neutral[400] : colors.neutral[500],
                        opacity: 0.6,
                      }}
                    >
                      {plan.period}
                    </span>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check
                          className="w-5 h-5 flex-shrink-0 mt-0.5"
                          style={{
                            color: plan.featured ? colors.emerald[500] : colors.neutral[500],
                          }}
                        />
                        <span
                          className="text-sm"
                          style={{
                            ...typography.body,
                            color: plan.featured ? colors.neutral[600] : colors.neutral[300],
                          }}
                        >
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Link to="/signup">
                    <motion.button
                      className="w-full py-4 rounded-xl text-sm"
                      style={{
                        ...typography.display,
                        fontWeight: 600,
                        background: plan.featured ? colors.red[500] : 'rgba(255,255,255,0.08)',
                        color: 'white',
                        border: plan.featured ? 'none' : '1px solid rgba(255,255,255,0.1)',
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {plan.cta}
                    </motion.button>
                  </Link>
                </motion.div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* FAQ - Split Layout */}
      {/* ================================================================== */}
      <section id="faq" className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-16">
            {/* Left - Sticky Header */}
            <FadeIn className="lg:col-span-4">
              <div className="lg:sticky lg:top-32">
                <span
                  className="text-xs uppercase block mb-6"
                  style={{
                    ...typography.mono,
                    letterSpacing: '0.15em',
                    color: colors.neutral[400],
                  }}
                >
                  FAQ
                </span>
                <h2
                  style={{
                    ...typography.display,
                    fontSize: 'clamp(2rem, 4vw, 2.5rem)',
                    lineHeight: 1.1,
                  }}
                >
                  Common questions
                </h2>
                <p
                  className="mt-6"
                  style={{
                    ...typography.body,
                    color: colors.neutral[600],
                  }}
                >
                  Everything you need to know about Lently.
                </p>
              </div>
            </FadeIn>

            {/* Right - FAQ Items */}
            <div className="lg:col-span-7 lg:col-start-6 space-y-4">
              {faqs.map((faq, i) => (
                <FadeIn key={i} delay={i * 0.05}>
                  <motion.div
                    className="rounded-2xl overflow-hidden"
                    style={{
                      background: expandedFaq === i ? colors.neutral[50] : 'transparent',
                      border: `1px solid ${colors.neutral[100]}`,
                    }}
                  >
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                      className="w-full p-6 flex items-center justify-between text-left"
                    >
                      <span
                        className="text-lg font-medium pr-8"
                        style={{ ...typography.display }}
                      >
                        {faq.q}
                      </span>
                      <motion.div
                        animate={{ rotate: expandedFaq === i ? 45 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <span
                          className="text-2xl font-light"
                          style={{ color: colors.neutral[400] }}
                        >
                          +
                        </span>
                      </motion.div>
                    </button>

                    <AnimatePresence>
                      {expandedFaq === i && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="px-6 pb-6">
                            <p
                              className="leading-relaxed"
                              style={{
                                ...typography.body,
                                color: colors.neutral[600],
                              }}
                            >
                              {faq.a}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* FINAL CTA - Full Bleed with Grain */}
      {/* ================================================================== */}
      <section
        className="relative py-24 lg:py-40 overflow-hidden"
        style={{ background: colors.neutral[900] }}
      >
        {/* Grain Texture */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Radial Gradient */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 80% 50% at 50% 100%, rgba(239,68,68,0.2) 0%, transparent 60%)`,
          }}
        />

        <div className="relative mx-auto max-w-5xl px-6 lg:px-8 text-center">
          <FadeIn>
            <h2
              style={{
                ...typography.display,
                fontSize: 'clamp(3rem, 8vw, 6rem)',
                lineHeight: 0.95,
                letterSpacing: '-0.03em',
                color: 'white',
              }}
            >
              Start understanding
              <br />
              your audience{' '}
              <span style={{ color: colors.red[500] }}>today</span>
            </h2>
          </FadeIn>

          <FadeIn delay={0.1}>
            <p
              className="mt-8 max-w-2xl mx-auto"
              style={{
                ...typography.body,
                fontSize: '1.25rem',
                lineHeight: 1.6,
                color: colors.neutral[400],
              }}
            >
              Join hundreds of creators who use Lently to make smarter content decisions.
              Try free—no credit card required.
            </p>
          </FadeIn>

          <FadeIn delay={0.2}>
            <Link to="/signup">
              <motion.button
                className="mt-12 group inline-flex items-center gap-3 px-10 py-5 rounded-2xl text-white"
                style={{
                  ...typography.display,
                  fontWeight: 600,
                  fontSize: '1.125rem',
                  background: colors.red[500],
                }}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                Start Analyzing Free
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </motion.button>
            </Link>
          </FadeIn>

          <FadeIn delay={0.3}>
            <p
              className="mt-6 text-sm"
              style={{ ...typography.body, color: colors.neutral[500] }}
            >
              No credit card required • Free forever plan available
            </p>
          </FadeIn>

          <FadeIn delay={0.4}>
            <div className="flex flex-wrap justify-center gap-8 mt-16">
              {[
                { icon: Shield, text: 'Secure & Private' },
                { icon: Zap, text: 'Instant Setup' },
                { icon: Clock, text: 'Cancel Anytime' },
              ].map((item) => (
                <div
                  key={item.text}
                  className="flex items-center gap-2 text-sm"
                  style={{ ...typography.body, color: colors.neutral[500] }}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ================================================================== */}
      {/* FOOTER - Minimal, Editorial */}
      {/* ================================================================== */}
      <footer
        className="pt-16 pb-8 lg:pt-20 lg:pb-12"
        style={{
          background: colors.neutral[50],
          borderTop: `1px solid ${colors.neutral[100]}`,
        }}
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12">
            {/* Logo & Desc */}
            <div className="lg:col-span-5">
              <Link to="/" className="inline-flex items-center gap-3 mb-6">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: colors.red[500] }}
                >
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span
                  className="text-xl"
                  style={{ ...typography.display, fontWeight: 700 }}
                >
                  Lently
                </span>
              </Link>
              <p
                className="max-w-sm"
                style={{
                  ...typography.body,
                  color: colors.neutral[500],
                }}
              >
                AI-powered comment intelligence for YouTube creators.
                Transform audience feedback into strategy.
              </p>
            </div>

            {/* Links */}
            <div className="lg:col-span-6 lg:col-start-7 grid grid-cols-3 gap-8">
              <div>
                <h4
                  className="text-sm font-semibold mb-4"
                  style={{ ...typography.display }}
                >
                  Product
                </h4>
                <ul className="space-y-3">
                  {['Features', 'Pricing', 'FAQ'].map((item) => (
                    <li key={item}>
                      <a
                        href={`#${item.toLowerCase()}`}
                        className="text-sm transition-colors hover:text-red-500"
                        style={{ ...typography.body, color: colors.neutral[500] }}
                      >
                        {item}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4
                  className="text-sm font-semibold mb-4"
                  style={{ ...typography.display }}
                >
                  Company
                </h4>
                <ul className="space-y-3">
                  {['Privacy', 'Terms', 'Contact'].map((item) => (
                    <li key={item}>
                      <a
                        href="#"
                        className="text-sm transition-colors hover:text-red-500"
                        style={{ ...typography.body, color: colors.neutral[500] }}
                      >
                        {item}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4
                  className="text-sm font-semibold mb-4"
                  style={{ ...typography.display }}
                >
                  Social
                </h4>
                <ul className="space-y-3">
                  <li>
                    <a
                      href="#"
                      className="text-sm transition-colors hover:text-red-500 flex items-center gap-2"
                      style={{ ...typography.body, color: colors.neutral[500] }}
                    >
                      <Youtube className="w-4 h-4" />
                      YouTube
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="text-sm transition-colors hover:text-red-500"
                      style={{ ...typography.body, color: colors.neutral[500] }}
                    >
                      𝕏 Twitter
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div
            className="mt-16 pt-8 flex flex-col md:flex-row items-center justify-between gap-4"
            style={{ borderTop: `1px solid ${colors.neutral[100]}` }}
          >
            <p
              className="text-sm"
              style={{ ...typography.body, color: colors.neutral[400] }}
            >
              © 2026 Lently. All rights reserved.
            </p>
            <p
              className="text-sm"
              style={{ ...typography.body, color: colors.neutral[400] }}
            >
              Made for creators, by creators.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
