'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthConfirm() {
  const router = useRouter()

  useEffect(() => {
    const handleConfirm = async () => {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            subscription.unsubscribe()

            const { data: student } = await supabase
              .from('students')
              .select('onboarding_complete')
              .eq('id', session.user.id)
              .single()

            router.push(student?.onboarding_complete ? '/dashboard' : '/onboarding')
          }
        }
      )

      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        subscription.unsubscribe()
        const { data: student } = await supabase
          .from('students')
          .select('onboarding_complete')
          .eq('id', session.user.id)
          .single()
        router.push(student?.onboarding_complete ? '/dashboard' : '/onboarding')
      }
    }

    void handleConfirm()
  }, [router])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      fontFamily: 'system-ui',
      background: '#f0f8f7'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '40px',
        textAlign: 'center',
        border: '1px solid #d0f7f2'
      }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>✅</div>
        <h2 style={{ color: '#189080', marginBottom: '8px' }}>
          Email confirmed!
        </h2>
        <p style={{ color: '#5a8a88' }}>
          Taking you to your account...
        </p>
      </div>
    </div>
  )
}
