import GlobalNav from '@/components/GlobalNav'
import styles from '../agents/layout.module.css'

export default function OrchestrateLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.layout}>
      <GlobalNav />
      <main className={styles.main}>{children}</main>
    </div>
  )
}
