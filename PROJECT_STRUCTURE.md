# SoundReal Project Structure

## Directory Structure

```
sound-real/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── blog/              # Blog pages
│   ├── dashboard/         # User dashboard
│   ├── lp/               # Landing page variations
│   ├── pricing/          # Pricing page
│   └── layout.tsx        # Root layout
├── components/            # Reusable components
│   ├── ui/               # UI components
│   ├── forms/            # Form components
│   └── layout/           # Layout components
├── lib/                  # Utility functions
│   ├── supabase/        # Supabase client
│   ├── stripe/          # Stripe utilities
│   └── utils/           # Helper functions
├── public/              # Static assets
│   ├── images/         # Image assets
│   └── fonts/          # Font files
├── styles/             # Global styles
├── types/              # TypeScript types
└── docs/              # Documentation
```

## Key Files

### Configuration Files
- `.cursor.json` - Cursor IDE configuration
- `next.config.js` - Next.js configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `tsconfig.json` - TypeScript configuration
- `.env.local` - Environment variables

### Core Files
- `app/layout.tsx` - Root layout with metadata
- `app/page.tsx` - Homepage
- `components/navigation.tsx` - Navigation component
- `components/footer.tsx` - Footer component

### API Routes
- `app/api/humanize/route.ts` - Text transformation API
- `app/api/webhooks/stripe/route.ts` - Stripe webhook handler

### Database
- `lib/supabase/schema.sql` - Database schema
- `lib/supabase/client.ts` - Supabase client

## Development Guidelines

1. **Component Organization**
   - Keep components small and focused
   - Use TypeScript for type safety
   - Follow naming conventions
   - Document props and usage

2. **State Management**
   - Use React hooks for local state
   - Supabase for server state
   - Context for global state

3. **Styling**
   - Use Tailwind CSS
   - Follow design system
   - Maintain consistency
   - Mobile-first approach

4. **Code Quality**
   - ESLint for linting
   - Prettier for formatting
   - TypeScript for types
   - Jest for testing

5. **Performance**
   - Optimize images
   - Lazy load components
   - Use proper caching
   - Monitor bundle size

## Deployment

1. **Environment Setup**
   - Set up environment variables
   - Configure build settings
   - Set up CI/CD pipeline

2. **Monitoring**
   - Error tracking
   - Performance monitoring
   - Usage analytics
   - Uptime monitoring

3. **Security**
   - API key protection
   - Rate limiting
   - Input validation
   - XSS protection 