import { useState, useRef, useEffect } from 'react'

export function CustomSelect({ 
  value, 
  onChange, 
  options, 
  placeholder = 'Select...',
  className = '',
  disabled = false 
}) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selected = options.find(o => o.value === value)

  return (
    <div ref={ref} style={{ position: 'relative' }} className={className}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '16px 20px',
          background: 'rgba(255,255,255,0.05)',
          border: isOpen ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          color: 'white',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: 'all 0.2s',
          outline: 'none'
        }}
      >
        <span style={{ color: selected ? 'white' : '#6b7280' }}>
          {selected ? selected.label : placeholder}
        </span>
        <svg 
          style={{ 
            width: '20px', 
            height: '20px', 
            color: '#9ca3af',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s'
          }} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div 
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            background: '#1a1a1a',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            overflow: 'hidden',
            zIndex: 99999,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            animation: 'dropdownOpen 0.15s ease-out'
          }}
        >
          <div style={{ maxHeight: '240px', overflowY: 'auto', padding: '8px 0' }}>
            {options.map((option, index) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: option.value === value ? 'rgba(239,68,68,0.2)' : 'transparent',
                  color: option.value === value ? '#f87171' : '#d1d5db',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  fontSize: '14px',
                  borderTop: index === 0 ? '2px solid #ef4444' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (option.value !== value) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                    e.currentTarget.style.color = 'white'
                  }
                }}
                onMouseLeave={(e) => {
                  if (option.value !== value) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = '#d1d5db'
                  }
                }}
              >
                {option.icon && <span style={{ fontSize: '20px', width: '28px', textAlign: 'center' }}>{option.icon}</span>}
                <span style={{ flex: 1 }}>{option.label}</span>
                {option.sublabel && (
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>{option.sublabel}</span>
                )}
                {option.value === value && (
                  <svg style={{ width: '20px', height: '20px', color: '#f87171' }} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes dropdownOpen {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}

export function ToggleOption({ 
  options, 
  value, 
  onChange, 
  className = '' 
}) {
  return (
    <div style={{ display: 'flex', gap: '8px' }} className={className}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: '12px',
            border: value === opt.value ? 'none' : '1px solid rgba(255,255,255,0.1)',
            background: value === opt.value 
              ? 'linear-gradient(135deg, #ff0000 0%, #ff6b6b 100%)' 
              : 'rgba(255,255,255,0.05)',
            color: 'white',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: 500
          }}
        >
          {opt.icon && <span>{opt.icon}</span>}
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  )
}
