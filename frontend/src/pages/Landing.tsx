import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Flame, Play, MessageSquare, BarChart3, Sparkles, Check, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const features = [
  {
    icon: MessageSquare,
    title: 'Analyze Comments',
    description: 'Automatically categorize thousands of comments into questions, praise, complaints, and more.',
  },
  {
    icon: BarChart3,
    title: 'Sentiment Analysis',
    description: 'Understand how your audience feels with AI-powered sentiment detection.',
  },
  {
    icon: Sparkles,
    title: 'Ask AI',
    description: 'Chat with AI about your comments. Get instant answers and content ideas.',
  },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <span className="font-logo text-xl font-medium tracking-tight">Lently</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link to="/signin">
              <Button variant="ghost" className="text-sm">Sign In</Button>
            </Link>
            <Link to="/signup">
              <Button className="btn-primary text-sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4" />
              AI-Powered YouTube Analytics
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
              Understand your audience
              <br />
              <span className="text-primary">in seconds</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Lently uses AI to analyze your YouTube comments, revealing what your viewers love, hate, and want to see next.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/signup">
                <Button className="btn-primary h-14 px-8 text-base gap-2">
                  Start Free <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Button variant="outline" className="btn-secondary h-14 px-8 text-base gap-2">
                <Play className="w-5 h-5" />
                Watch Demo
              </Button>
            </div>
          </motion.div>

          {/* Hero Image/Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-16 relative"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none h-32 bottom-0 top-auto" />
            <div className="rounded-2xl border border-border bg-card shadow-2xl shadow-primary/5 overflow-hidden">
              <div className="aspect-video bg-gradient-to-br from-primary/5 to-transparent flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <BarChart3 className="w-10 h-10 text-primary" />
                  </div>
                  <p className="text-lg font-medium">Dashboard Preview</p>
                  <p className="text-sm text-muted-foreground">Analyze comments, track sentiment, get AI insights</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-secondary/30">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold mb-4">Everything you need to grow</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Powerful tools to help you understand your audience and create better content.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="card-premium text-center"
              >
                <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center">
                  <feature.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold mb-4">Ready to understand your audience?</h2>
            <p className="text-muted-foreground mb-8">
              Join thousands of creators using Lently to grow their channels.
            </p>
            <Link to="/signup">
              <Button className="btn-primary h-14 px-8 text-base">
                Get Started Free
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground mt-4">
              No credit card required • 3 videos free per month
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-primary" />
            <span className="font-logo text-lg">Lently</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 Lently. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
