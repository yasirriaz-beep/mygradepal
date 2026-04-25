'use client'
import Link from 'next/link'

export default function StudyLock() {
  return (
    <div style={{
      minHeight:'100vh',
      background:'#189080',
      display:'flex',
      flexDirection:'column',
      alignItems:'center',
      justifyContent:'center',
      color:'white',
      textAlign:'center',
      padding:'20px'
    }}>
      <h1 style={{fontSize:'32px',fontWeight:'800',marginBottom:'16px'}}>
        Time to study! 📚
      </h1>
      <p style={{fontSize:'18px',marginBottom:'32px',opacity:0.9}}>
        Your study session is waiting
      </p>
      <Link href="/dashboard" style={{
        padding:'16px 32px',
        background:'white',
        color:'#189080',
        borderRadius:'100px',
        textDecoration:'none',
        fontWeight:'700',
        fontSize:'16px'
      }}>
        Start studying now →
      </Link>
      <Link href="/" style={{
        marginTop:'16px',
        color:'rgba(255,255,255,0.7)',
        textDecoration:'none',
        fontSize:'14px'
      }}>
        ← Back to home
      </Link>
    </div>
  )
}
