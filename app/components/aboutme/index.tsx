"use client"

import { GitHub, Mail, RSS, Twitter } from '@components/icons'
import Link from '@components/link'
import ThemeSwitcher from '@components/theme-switcher'
import { Button } from '@components/ui/button'
import { motion } from 'framer-motion'

const socialLinks = [
  { icon: GitHub, href: "https://github.com/maxleiter", label: "GitHub" },
  { icon: Twitter, href: "https://twitter.com/max_leiter", label: "Twitter" },
  { icon: Mail, href: "mailto:maxwell.leiter@gmail.com", label: "Email" },
  { icon: RSS, href: "/feed.mxl", label: "RSS" }
]

export default function AboutMe() {
  return <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="space-y-6"
  >
    <div className="pt-8 lg:pt-0">
      <h1 className="text-5xl font-bold tracking-tight">Max Leiter</h1>
    </div>
    <p className="text-lg leading-relaxed text-muted-foreground">
      I'm currently building{" "}
      <Link href="https://v0.dev" className="no-underline" target="_blank" rel="noopener noreferrer">
        v0
      </Link>
      {" "}
      at{" "}
      <Link href="https://vercel.com/home" className="dark:!text-white !text-black no-underline" target="_blank" rel="noopener noreferrer">
        <span aria-hidden className="text-sm translate-y-[-0.1em] inline-block transition-transform">
          ▲
        </span>
        Vercel
      </Link>
      . I'm interested in politics, tech, and building a fast, accessible web.
    </p>
    <div className="flex space-x-3">
      <ThemeSwitcher />
      {socialLinks.map((social) => (
        <Button
          key={social.label}
          variant="outline"
          size="icon"
          className="transition-all hover:bg-muted bg-card border-border"
          asChild
        >
          <Link href={social.href}>
            <social.icon className="w-5 h-5" />
            <span className="sr-only">{social.label}</span>
          </Link>
        </Button>
      ))}
    </div>
  </motion.div>
}