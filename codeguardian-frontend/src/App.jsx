import React from 'react'

function App() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f9fafb', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '64px',
          height: '64px',
          background: 'linear-gradient(to right, #2563eb, #9333ea)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px auto'
        }}>
          <span style={{ color: 'white', fontWeight: 'bold', fontSize: '20px' }}>CG</span>
        </div>
        <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
          CodeGuardian
        </h1>
        <p style={{ color: '#4b5563', marginBottom: '32px' }}>
          AI-Powered Code Reviews
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <button style={{
            backgroundColor: '#2563eb',
            color: 'white',
            padding: '8px 24px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px'
          }}>
            Get Started
          </button>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            Application loaded successfully!
          </div>
        </div>
      </div>
    </div>
  )
}

export default App

