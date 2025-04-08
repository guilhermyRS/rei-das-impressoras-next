'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Dashboard from '@/components/Dashboard'
import { useAuth } from '@/lib/auth'

export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  
  useEffect(() => {
    if (!user) {
      router.push('/login')
    }
  }, [user, router])
  
  if (!user) return null
  
  return <Dashboard />
}