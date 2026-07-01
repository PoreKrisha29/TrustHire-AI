import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { Toaster } from 'sonner'
import useThemeStore from '@/stores/theme.store'

export default function DashboardLayout() {
  const theme = useThemeStore((state) => state.theme)

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 ml-[260px] min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Outlet />
        </div>
      </main>
      <Toaster richColors theme={theme} position="top-right" />
    </div>
  )
}
