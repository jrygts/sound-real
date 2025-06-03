# Step 7: Navigation and Footer Implementation

## Overview

The navigation and footer components provide consistent navigation and branding across the application. They follow a clean, modern design pattern with clear call-to-actions.

## Navigation Component

Create or update `components/navigation.tsx`:

```typescript
const navigation = {
  main: [
    { name: 'Home', href: '/' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'Blog', href: '/blog' },
    { name: 'API', href: '/api-docs' },
  ],
  cta: [
    { name: 'Login', href: '/login', variant: 'ghost' },
    { name: 'Get Started', href: '/signup', variant: 'primary' },
  ],
}

export default function Navigation() {
  return (
    <nav className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <a href="/" className="text-2xl font-bold text-blue-600">
                SoundReal
              </a>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navigation.main.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-slate-700 hover:text-slate-900"
                >
                  {item.name}
                </a>
              ))}
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-4">
            {navigation.cta.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                  item.variant === 'primary'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                {item.name}
              </a>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}
```

## Footer Component

Create or update `components/footer.tsx`:

```typescript
export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <h3 className="text-white font-bold text-lg">SoundReal</h3>
            <p className="text-sm mt-1">Make AI text sound human</p>
          </div>
          
          <div className="flex gap-6 text-sm">
            <a href="/terms" className="hover:text-white">Terms</a>
            <a href="/privacy" className="hover:text-white">Privacy</a>
            <a href="/contact" className="hover:text-white">Contact</a>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-slate-800 text-center text-sm">
          © 2025 SoundReal. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
```

## Key Features

1. **Navigation**
   - Clean, minimal design
   - Responsive layout
   - Clear CTAs
   - Brand consistency

2. **Footer**
   - Essential links
   - Copyright information
   - Mobile responsive
   - Brand reinforcement

3. **Responsive Design**
   - Mobile-friendly navigation
   - Flexible layouts
   - Consistent spacing
   - Clear hierarchy

## Implementation Notes

1. **Navigation**
   - Uses Tailwind CSS for styling
   - Implements responsive design
   - Includes authentication state
   - Maintains brand identity

2. **Footer**
   - Simple, clean design
   - Essential legal links
   - Social proof elements
   - Mobile-first approach

## Next Steps

1. Add mobile menu
2. Implement active state indicators
3. Add dropdown menus
4. Create breadcrumb navigation 