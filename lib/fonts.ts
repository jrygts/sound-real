import { Inter } from "next/font/google"

export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

// If you have Calibre font files, you can add them here
// For now, we'll use Inter as the heading font as well
export const calibre = inter // Fallback to Inter for now
