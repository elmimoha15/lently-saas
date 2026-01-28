import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Star, ArrowUpRight } from 'lucide-react';
import { FadeIn } from './FadeIn';
import { typography, colors } from './constants';

interface HeroSectionProps {
  heroRef: React.RefObject<HTMLDivElement>;
}

export const HeroSection = ({ heroRef }: HeroSectionProps) => {
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  return (
    <section
      ref={heroRef}
      className="relative pt-40 pb-32 lg:pt-48 lg:pb-40 overflow-hidden"
      style={{ background: '#FAFAFA' }}
    >
      {/* Grid Pattern Background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(0,0,0,0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0,0,0,0.08) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
      {/* Radial fade overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 40%, transparent 0%, rgba(250,250,250,0.5) 70%)',
        }}
      />
      
      <motion.div
        className="relative mx-auto max-w-5xl px-6 lg:px-8"
        style={{ opacity: heroOpacity, scale: heroScale }}
      >
        <div className="text-center">
          {/* Headline with serif italic contrast */}
          <FadeIn delay={0}>
            <h1
              className="mb-8"
              style={{
                fontSize: 'clamp(2.75rem, 6vw, 4.5rem)',
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                color: colors.neutral[900],
              }}
            >
              <span style={{ ...typography.display, fontWeight: 600 }}>
                Your Audience is Talking 
              </span>
              <br />
              <span style={{ ...typography.display, fontWeight: 600 }}>
                Are you{' '}
              </span>
              <span
                style={{
                  ...typography.serif,
                  fontStyle: 'italic',
                  fontWeight: 400,
                }}
              >
                Listening?
              </span>
            </h1>
          </FadeIn>

          {/* Subheading */}
          <FadeIn delay={0.1}>
            <p
              className="mx-auto mb-10"
              style={{
                ...typography.body,
                fontSize: '1.125rem',
                lineHeight: 1.7,
                color: colors.neutral[500],
                maxWidth: '580px',
              }}
            >
              Lently helps YouTube creators understand their audience by analyzing
              comments with AI, giving you the insights you need to grow faster.
            </p>
          </FadeIn>

          {/* CTA with social proof */}
          <FadeIn delay={0.2}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              {/* Primary CTA */}
              <Link to="/signup">
                <motion.button
                  className="group inline-flex items-center gap-3 px-7 py-4 rounded-full text-white shadow-lg"
                  style={{
                    ...typography.display,
                    fontWeight: 500,
                    fontSize: '0.95rem',
                    background: colors.red[500],
                    boxShadow: '0 8px 32px rgba(239, 68, 68, 0.3)',
                  }}
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Get Started
                  <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </motion.button>
              </Link>

              {/* Social proof avatars */}
              <div className="flex items-center gap-3">
                {/* Avatar stack */}
                <div className="flex -space-x-2">
                  {[
                    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40&h=40&fit=crop&crop=face',
                    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face',
                    'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=40&h=40&fit=crop&crop=face',
                    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face',
                  ].map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt=""
                      className="w-9 h-9 rounded-full border-2 border-white object-cover"
                    />
                  ))}
                </div>
                {/* Rating */}
                <div className="text-left">
                  <div className="flex gap-0.5 mb-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-3.5 h-3.5 fill-amber-400 text-amber-400"
                      />
                    ))}
                  </div>
                  <p
                    style={{
                      ...typography.body,
                      fontSize: '0.8rem',
                      color: colors.neutral[500],
                    }}
                  >
                    Trusted by 500+ creators
                  </p>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </motion.div>
    </section>
  );
};
