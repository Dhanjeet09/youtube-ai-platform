import { useState, useRef, useEffect, useCallback } from 'react'

/**
 * CustomSelect - Accessible custom dropdown
 * Kinetic Glass design
 */
export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className = '',
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIdx, setFocusedIdx] = useState(-1)
  const ref = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen && focusedIdx >= 0 && listRef.current) {
      const item = listRef.current.children[focusedIdx]
      if (item) item.scrollIntoView({ block: 'nearest' })
    }
  }, [isOpen, focusedIdx])

  const selectOption = useCallback((optionValue) => {
    onChange(optionValue)
    setIsOpen(false)
    setFocusedIdx(-1)
  }, [onChange])

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        setIsOpen(true)
        setFocusedIdx(0)
      }
      return
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        setFocusedIdx(-1)
        break
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIdx(prev => Math.min(prev + 1, options.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIdx(prev => Math.max(prev - 1, 0))
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (focusedIdx >= 0 && focusedIdx < options.length) {
          selectOption(options[focusedIdx].value)
        }
        break
      case 'Home':
        e.preventDefault()
        setFocusedIdx(0)
        break
      case 'End':
        e.preventDefault()
        setFocusedIdx(options.length - 1)
        break
    }
  }

  const selected = options.find(o => o.value === value)
  const listboxId = 'custom-select-listbox'

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={focusedIdx >= 0 ? `option-${options[focusedIdx]?.value}` : undefined}
        aria-haspopup="listbox"
        className={`
          w-full px-5 py-3.5 glass rounded-xl text-left flex items-center justify-between gap-2
          transition-all duration-200 outline-none touch-target
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${isOpen ? 'border-primary/50' : 'border-glass-border hover:border-white/20'}
          ${selected ? 'text-on-surface' : 'text-gray-500'}
        `}
      >
        <span className="truncate text-body-sm">{selected ? selected.label : placeholder}</span>
        <svg
          className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 right-0 mt-2 z-[99999] bg-[#1a1a1a] border border-glass-border rounded-xl overflow-hidden shadow-2xl shadow-black/50 animate-dropdown"
          role="listbox"
          id={listboxId}
          aria-label={placeholder}
        >
          <div ref={listRef} className="max-h-[240px] overflow-y-auto py-2" role="presentation">
            {options.map((option, index) => {
              const isSelected = option.value === value
              const isFocused = focusedIdx === index
              return (
                <button
                  key={option.value}
                  id={`option-${option.value}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => selectOption(option.value)}
                  onMouseEnter={() => setFocusedIdx(index)}
                  className={`
                    w-full px-5 py-3 text-left flex items-center gap-3 transition-colors duration-100
                    border-none cursor-pointer text-body-sm touch-target
                    ${isSelected
                      ? 'bg-primary-container/20 text-primary'
                      : isFocused
                        ? 'bg-white/10 text-white'
                        : 'text-gray-300 hover:bg-white/5 hover:text-white'
                    }
                  `}
                >
                  {option.icon && (
                    <span className="text-xl w-7 text-center flex-shrink-0">{option.icon}</span>
                  )}
                  <span className="flex-1 truncate">{option.label}</span>
                  {option.sublabel && (
                    <span className="text-xs text-gray-500 flex-shrink-0">{option.sublabel}</span>
                  )}
                  {isSelected && (
                    <svg className="w-5 h-5 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
