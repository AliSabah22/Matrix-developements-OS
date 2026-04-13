import NavSidebar from '@/components/nav-sidebar'
import styles from './layout.module.css'

export default function AgentsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.layout}>
      <NavSidebar />
      <main className={styles.main}>{children}</main>
    </div>
  )
}
