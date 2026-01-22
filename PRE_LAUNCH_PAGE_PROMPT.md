# Prompt for Lovable/Bolt Pre-Launch Page (Matching Your SaaS Dashboard Style)

```markdown
Create a premium pre-launch waitlist landing page for "Lently" - a SaaS that analyzes YouTube comments with AI to generate content ideas and audience insights.

IMPORTANT: Match the exact design system from the Lently dashboard (Apple-inspired, clean, minimal).

## Core Design System (Match Dashboard Exactly)

### Typography
- **Font Family**: San Francisco system font stack
  ```css
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', sans-serif;
  ```
- **Font Rendering**:
  ```css
  font-feature-settings: 'kern' 1;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  ```
- **Size Scale**:
  - Hero headline: `text-5xl` (48px), `font-semibold`, `tracking-tight`
  - Section headings: `text-3xl` (30px), `font-semibold`, `tracking-tight`
  - Subheadings: `text-2xl` (24px), `font-semibold`
  - Body text: `text-base` (16px), `leading-relaxed`
  - Muted text: `text-muted-foreground`

### Spacing System (Multiples of 8px)
- Section padding: `py-20` (80px)
- Card padding: `p-8` (32px)
- Section gaps: `space-y-12` (48px)
- Element gaps: `space-y-6` (24px)
- Max width: `max-w-7xl mx-auto`

### Card Design
- **Border Radius**: `rounded-2xl` (16px)
- **Padding**: `p-8` (32px)
- **Shadow**: Soft and subtle
  ```css
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  ```
- **Hover Effect**: Gentle elevation
  ```css
  transition: all 0.2s ease;
  hover:shadow-md
  ```
- **Border**: `border border-border` (subtle, not prominent)

### Color Palette (Use Shadcn/UI tokens)
```css
/* Light mode (primary) */
--background: 0 0% 100%;
--foreground: 222 47% 11%;
--card: 0 0% 100%;
--card-foreground: 222 47% 11%;
--primary: 263 70% 50%; /* Purple */
--primary-foreground: 0 0% 100%;
--secondary: 210 40% 96%;
--muted: 210 40% 96%;
--muted-foreground: 215 16% 47%;
--border: 214 32% 91%;
```

### Button Styles
- **Primary CTA**: 
  - `rounded-full` (fully rounded)
  - `px-8 py-3` or `size-lg`
  - Gradient optional: `bg-gradient-to-r from-primary to-primary/80`
- **Secondary**: 
  - `rounded-full`
  - `variant="outline"`
- **Hover**: Subtle scale `hover:scale-105` with `transition-transform duration-200`

### Animation System
- **Page Load**: Container fade-in
  ```jsx
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.5 }}
  ```
- **Staggered Sections**: Sequential delays
  ```jsx
  delay: 0.1, 0.2, 0.3, 0.4...
  ```
- **Slide-up Effect**:
  ```jsx
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
  ```
- **Smooth**: 60fps (only use transform/opacity)

## Page Structure (Keep It Simple - Apple Philosophy)

### 1. Navigation Bar
- Logo: "Lently" text (same font as dashboard)
- Transparent background with `backdrop-blur-lg` when scrolling
- Right side: "Sign In" link + "Join Waitlist" button (`rounded-full`, `size-lg`)
- Sticky position
- Max-width: `max-w-7xl mx-auto px-6`
- Padding: `py-4`
- Border bottom: `border-b border-border` (only when scrolling)

### 2. Hero Section (Above Fold)
**Layout**: Centered, single column

**Content**:
- Badge: "🚀 Launching February 2026" 
  - Style: `px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium`
- Headline: "Turn YouTube Comments Into Your Content Strategy"
  - Style: `text-5xl font-semibold tracking-tight text-foreground max-w-4xl mx-auto`
- Subheadline: "Analyze thousands of comments in 60 seconds. Get content ideas based on what your audience actually wants."
  - Style: `text-xl text-muted-foreground max-w-2xl mx-auto mt-6 leading-relaxed`
- Email form:
  - Input + Button in flex row
  - Input: `rounded-full border-border`
  - Button: `rounded-full bg-primary text-primary-foreground size-lg`
  - Width: `max-w-md mx-auto`
- Trust line below: "✅ 14-day free trial • No credit card • 500+ creators waiting"
  - Style: `text-sm text-muted-foreground`

**Visual**:
- Dashboard mockup image (screenshot of your actual dashboard)
- Style: `rounded-2xl shadow-2xl border border-border mt-12`
- Optional: Subtle gradient background `from-primary/5 to-transparent`

**Spacing**:
- Padding: `py-20 px-6`
- Gap between elements: `space-y-6`

### 3. Social Proof Bar
- Simple, clean strip
- "Trusted by 500+ creators" with avatar stack
- Background: `bg-muted/30`
- Padding: `py-8`
- Border: `border-y border-border`

### 4. Problem Statement Section
**Headline**: "You're Sitting on a Goldmine of Ideas"
- Style: `text-3xl font-semibold tracking-tight text-center mb-12`

**Layout**: 2x2 grid on desktop (`grid grid-cols-1 md:grid-cols-2 gap-6`)

**Content**: 4 pain point cards
- Each card: `p-8 rounded-2xl border border-border bg-card`
- Icon: Lucide icon, `size-6 text-destructive` (red X)
- Title: `text-lg font-semibold mt-4`
- Description: `text-muted-foreground mt-2`

Pain points:
1. "Manually reading 1,000+ comments takes hours"
2. "Buried feature requests get lost in the noise"
3. "You miss trending topics your audience cares about"
4. "Content decisions based on gut feeling, not data"

**Spacing**: `py-20 px-6 max-w-7xl mx-auto`

### 5. Features Section (Your Core Value)
**Headline**: "Everything You Need to Grow Faster"
- Style: `text-3xl font-semibold tracking-tight text-center mb-4`
**Subheadline**: "Simple, powerful tools that actually work"
- Style: `text-xl text-muted-foreground text-center mb-12`

**Layout**: 3-column grid (`grid grid-cols-1 md:grid-cols-3 gap-6`)

**Each Feature Card**:
- Container: `p-8 rounded-2xl border border-border bg-card hover:shadow-md transition-all duration-200`
- Icon badge: `p-3 rounded-full bg-primary/10 w-fit mb-6`
  - Icon inside: `size-6 text-primary`
- Title: `text-xl font-semibold mb-3`
- Description: `text-muted-foreground leading-relaxed`
- Screenshot: `rounded-xl border border-border mt-6` (actual dashboard screenshots)

**Features**:
1. **60-Second Insights** (Sparkles icon)
   - "Analyze thousands of comments instantly. Our AI extracts themes and patterns you'd never catch manually."
   
2. **Content Ideas on Demand** (Lightbulb icon)
   - "Get ranked video ideas pulled from viewer requests. Top 3 ideas updated after every analysis."

3. **Audience Sentiment** (Heart icon)
   - "Understand how viewers feel. See sentiment breakdown, category analysis, and trending topics."

**Spacing**: `py-20 px-6 max-w-7xl mx-auto`

### 6. How It Works (4 Steps)
**Headline**: "Simple. Powerful. Fast."
- Style: `text-3xl font-semibold tracking-tight text-center mb-16`

**Layout**: Horizontal timeline with connecting line

**Design**:
- Each step container: `flex items-start gap-6`
- Number badge: `flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground text-xl font-semibold`
- Content: Title + Description
- Connecting line between steps: `border-l-2 border-primary/20` (vertical line)

**Steps**:
1. **Connect** - "Paste any YouTube URL. No API keys needed."
2. **Analyze** - "AI reads every comment in under 60 seconds."
3. **Discover** - "Get actionable insights and content ideas."
4. **Grow** - "Create videos people actually ask for."

**Spacing**: `py-20 px-6 max-w-5xl mx-auto`

### 7. Benefits Grid (Why Use Lently)
**Headline**: "Why Creators Choose Lently"

**Layout**: 2x2 grid (`grid grid-cols-1 md:grid-cols-2 gap-6`)

**Each Card**:
- Container: `p-8 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent border border-border`
- Icon: `size-8 text-primary mb-4`
- Title: `text-xl font-semibold mb-2`
- Description: `text-muted-foreground`

**Benefits**:
1. "Save 10+ Hours Per Week" (Clock icon)
2. "Create What People Want" (Target icon)
3. "3x More Engagement" (TrendingUp icon)
4. "Scale Faster" (Rocket icon)

**Spacing**: `py-20 px-6 max-w-7xl mx-auto`

### 8. Waitlist Benefits (Early Access)
**Design**: Single centered card with gradient border

**Container**:
- `max-w-2xl mx-auto p-12 rounded-2xl`
- Gradient border: `border-2 border-primary/30`
- Background: `bg-card`

**Content**:
- Badge: "Waitlist Exclusive" (`bg-primary/10 text-primary rounded-full px-3 py-1`)
- Headline: "Early Access Perks"
- List of benefits (checkmark icons):
  - ✅ 14-day free trial
  - ✅ 50% off first 3 months
  - ✅ Unlimited analyses (first 100)
  - ✅ Priority support
  - ✅ Feature voting rights
- CTA button: `rounded-full size-lg w-full`

**Spacing**: `py-20 px-6`

### 9. FAQ Section
**Headline**: "Frequently Asked Questions"

**Design**: Accordion style (shadcn/ui Accordion component)
- Max-width: `max-w-3xl mx-auto`
- Each item: `border-b border-border py-6`
- Question: `text-lg font-semibold`
- Answer: `text-muted-foreground mt-2 leading-relaxed`

**Questions** (6 total):
1. Do I need coding skills?
   - "Nope! Just paste a YouTube URL and click analyze. It's that simple."
2. How long does analysis take?
   - "60 seconds for most videos. Even videos with 10,000+ comments."
3. What if my video has no comments?
   - "Lently works best with 50+ comments, but we'll analyze whatever's available."
4. Do you store my YouTube data?
   - "We only analyze public comments. We never store passwords or access your account."
5. Can I analyze competitor videos?
   - "Absolutely! Paste any public YouTube video URL."
6. Is there a free trial?
   - "Waitlist members get 14 days free + exclusive early-bird pricing."

**Spacing**: `py-20 px-6`

### 10. Final CTA Section
**Design**: Full-width gradient background

**Container**:
- Background: `bg-gradient-to-br from-primary/10 via-primary/5 to-transparent`
- Padding: `py-20 px-6`
- Content card: `max-w-2xl mx-auto p-12 rounded-2xl bg-card/80 backdrop-blur-sm border border-border`

**Content**:
- Headline: "Stop Guessing. Start Growing."
- Subheadline: "Join 500+ creators turning comments into content gold"
- Email form (large, centered)
- Trust badges below in flex row
- All text centered

### 11. Footer
**Design**: Minimal, Apple-style
- Background: `bg-muted/30`
- Padding: `py-12 px-6`
- Border top: `border-t border-border`
- Max-width: `max-w-7xl mx-auto`

**Content**:
- Logo + tagline (left)
- Links in flex row (center): About • Features • Contact
- Social icons (right): Twitter, LinkedIn
- Copyright below (centered, `text-sm text-muted-foreground`)

## Technical Stack

### Required
- **Framework**: React 18+ with TypeScript
- **Styling**: Tailwind CSS (exact config from dashboard)
- **Components**: shadcn/ui (Button, Card, Input, Accordion)
- **Icons**: Lucide React
- **Animation**: Framer Motion
- **Form**: React Hook Form with Zod validation

### Tailwind Config (Match Dashboard)
```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
      },
    },
  },
}
```

## Design Principles to Follow

1. ✅ **Simplicity First** - No unnecessary elements
2. ✅ **Consistent Spacing** - Always multiples of 8px
3. ✅ **Subtle Shadows** - Never harsh, always soft
4. ✅ **Generous Padding** - p-8 for cards, py-20 for sections
5. ✅ **Large Border Radius** - rounded-2xl everywhere
6. ✅ **Muted Colors** - Use foreground/muted-foreground
7. ✅ **One CTA per Section** - Don't overwhelm
8. ✅ **Breathing Room** - space-y-12 between sections
9. ✅ **Typography Hierarchy** - Clear size differences
10. ✅ **Smooth Animations** - Only transform/opacity, 60fps

## Do NOT Include

❌ Complex gradients everywhere
❌ Multiple CTAs competing for attention
❌ Bright, saturated colors
❌ Harsh shadows or heavy borders
❌ Tight spacing (no p-4 or py-6)
❌ Small border radius (no rounded-lg)
❌ Flashy animations or particle effects
❌ Cluttered sections with too much info
❌ Generic stock photos
❌ Testimonial cards without real content

## Visual Reference

Use these actual dashboard elements as reference:
- Hero insight card style (p-8, rounded-2xl, subtle shadow)
- "Your Next Video" card layout (gradient background, top idea highlighted)
- Clean typography (SF Pro, tracking-tight, proper hierarchy)
- Button style (rounded-full, proper padding)
- Muted color usage throughout

Think: "What would Apple do?" - Clean, simple, spacious, purposeful.

The landing page should feel like a natural extension of the dashboard, not a separate marketing site.
```
