'use client'

// Renders GlobalNav sidebar for all routes except /ops (which has its own full-screen layout)

import { usePathname } from 'next/navigation'
import GlobalNav from './GlobalNav'
import styles from './LayoutWrapper.module.css'

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // /ops has its own full-screen layout (Dashboard.tsx with its own sidebar)
  // /agents/*, /orchestrate, /projects/* have their own sub-layouts with GlobalNav
  // We only inject GlobalNav here for the root Command Center (/)

  const needsSidebar = pathname === '/'

  if (!needsSidebar) {
    return <>{children}</>
  }

  return (
    <div className={styles.layout}>
      <GlobalNav />
      <main className={styles.main}>{children}</main>
    </div>
  )
}
