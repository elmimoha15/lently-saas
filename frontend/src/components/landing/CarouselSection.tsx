import { motion } from 'framer-motion';
import { typography, colors } from './constants';

const channels = [
  { name: 'TechWithTim', subs: '1.2M' },
  { name: 'CodeWithChris', subs: '890K' },
  { name: 'DesignCourse', subs: '550K' },
  { name: 'Traversy Media', subs: '2.1M' },
  { name: 'The Coding Train', subs: '1.8M' },
  { name: 'Ben Awad', subs: '420K' },
  { name: 'Fireship', subs: '2.5M' },
  { name: 'Kevin Powell', subs: '780K' },
  { name: 'Web Dev Simplified', subs: '1.5M' },
  { name: 'Theo', subs: '320K' },
  { name: 'Jack Herrington', subs: '180K' },
  { name: 'Matt Pocock', subs: '95K' },
];

export const CarouselSection = () => {
  return (
    <section className="py-12 lg:py-16 overflow-hidden" style={{ background: '#FFFFFF' }}>
      <div className="mx-auto max-w-7xl px-6 lg:px-8 mb-8">
        <p
          className="text-center text-sm"
          style={{ ...typography.body, color: colors.neutral[400] }}
        >
          Trusted by creators worldwide
        </p>
      </div>
      {/* Infinite Scrolling Carousel */}
      <div className="relative">
        {/* Gradient masks for smooth edges */}
        <div className="absolute left-0 top-0 bottom-0 w-40 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-40 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
        
        <motion.div
          className="flex gap-12 items-center"
          animate={{ x: ['0%', '-50%'] }}
          transition={{
            x: {
              duration: 25,
              repeat: Infinity,
              ease: 'linear',
            },
          }}
        >
          {/* Duplicate items for seamless loop */}
          {[...Array(2)].map((_, setIndex) => (
            <div key={setIndex} className="flex gap-12 items-center shrink-0">
              {channels.map((channel, i) => (
                <span
                  key={`${setIndex}-${i}`}
                  className="whitespace-nowrap"
                  style={{
                    ...typography.display,
                    fontSize: '1.1rem',
                    fontWeight: 500,
                    color: colors.neutral[300],
                  }}
                >
                  {channel.name}
                </span>
              ))}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
