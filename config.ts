import themes from "daisyui/src/theming/themes";
import { ConfigProps } from "./types/config";

const config = {
  // REQUIRED
  appName: "SoundReal",
  // REQUIRED: a short description of your app for SEO tags (can be overwritten)
  appDescription:
    "Transform AI-generated content into natural, undetectable prose.",
  // REQUIRED (no https://, not trialing slash at the end, just the naked domain)
  domainName: "sound-real.com",
  crisp: {
    // Crisp website ID. IF YOU DON'T USE CRISP: just remove this => Then add a support email in this config file (resend.supportEmail) otherwise customer support won't work.
    id: "",
    // Hide Crisp by default, except on route "/". Crisp is toggled with <ButtonSupport/>. If you want to show Crisp on every routes, just remove this below
    onlyShowOnRoutes: ["/"],
  },
  stripe: {
    // Create multiple plans in your Stripe dashboard, then add them here. You can add as many plans as you want, just make sure to add the priceId
    plans: [
      {
        // REQUIRED — we use this to find the plan in the webhook (for instance if you want to update the user's credits based on the plan)
        priceId: process.env.NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID!, // Basic Plan
        //  REQUIRED - Name of the plan, displayed on the pricing page
        name: "Basic",
        // A friendly description of the plan, displayed on the pricing page. Tip: explain why this plan and not others
        description: "Perfect for getting started",
        // The price you want to display, the one user will be charged on Stripe.
        price: 6.99,
        // If you have an anchor price (i.e. $29) that you want to display crossed out, put it here. Otherwise, leave it empty
        priceAnchor: undefined,
        features: [
          { name: "5,000 words per month" },
          { name: "Bypass all AI detectors (incl. Turnitin & GPTZero)" },
          { name: "Basic Humanization Engine" },
          { name: "Plagiarism-free" },
          { name: "Error-free rewriting" },
          { name: "Undetectable results" },
          { name: "Unlimited AI detection" },
          { name: "20 languages supported" },
        ],
      },
      {
        priceId: process.env.NEXT_PUBLIC_STRIPE_PLUS_PRICE_ID!, // Plus Plan
        // This plan will look different on the pricing page, it will be highlighted. You can only have one plan with isFeatured: true
        isFeatured: true,
        name: "Plus",
        description: "Most popular for serious content creators",
        price: 19.99,
        priceAnchor: undefined,
        features: [
          { name: "15,000 words per month" },
          { name: "Everything in Basic PLUS:" },
          { name: "Advanced Humanization Engine" },
          { name: "50+ languages supported" },
          { name: "Advanced Turnitin Bypass Engine" },
          { name: "Human-like results" },
          { name: "Unlimited grammar checks" },
          { name: "Fast mode" },
        ],
      },
      {
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID!, // Pro Plan
        name: "Pro",
        description: "For power users who need the best",
        price: 39.99,
        priceAnchor: undefined,
        features: [
          { name: "30,000 words per month" },
          { name: "Everything in Plus PLUS:" },
          { name: "Ultra-human writing output" },
          { name: "Priority support" },
        ],
      },
    ],
  },
  aws: {
    // If you use AWS S3/Cloudfront, put values in here
    bucket: "bucket-name",
    bucketUrl: `https://bucket-name.s3.amazonaws.com/`,
    cdn: "https://cdn-id.cloudfront.net/",
  },
  resend: {
    // REQUIRED — Email 'From' field to be used when sending magic login links
    fromNoReply: `ShipFast <noreply@resend.shipfa.st>`,
    // REQUIRED — Email 'From' field to be used when sending other emails, like abandoned carts, updates etc..
    fromAdmin: `Marc at ShipFast <marc@resend.shipfa.st>`,
    // Email shown to customer if need support. Leave empty if not needed => if empty, set up Crisp above, otherwise you won't be able to offer customer support."
    supportEmail: "marc.louvion@gmail.com",
  },
  colors: {
    // REQUIRED — The DaisyUI theme to use (added to the main layout.js). Leave blank for default (light & dark mode). If you any other theme than light/dark, you need to add it in config.tailwind.js in daisyui.themes.
    theme: "light",
    // REQUIRED — This color will be reflected on the whole app outside of the document (loading bar, Chrome tabs, etc..). By default it takes the primary color from your DaisyUI theme (make sure to update your the theme name after "data-theme=")
    // OR you can just do this to use a custom color: main: "#f37055". HEX only.
    main: themes["light"]["primary"],
  },
  auth: {
    // REQUIRED — the path to log in users. It's use to protect private routes (like /dashboard). It's used in apiClient (/libs/api.js) upon 401 errors from our API
    loginUrl: "/auth",
    // REQUIRED — the path you want to redirect users after successfull login (i.e. /dashboard, /private). This is normally a private page for users to manage their accounts. It's used in apiClient (/libs/api.js) upon 401 errors from our API & in ButtonSignin.js
    callbackUrl: "/dashboard",
  },
} as ConfigProps;

export default config;
