import React from 'react'

interface ToggleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active: boolean
  baseClass?: string
}

/** A button that appends `tab-button--active` to its class when `active` is true. */
export function ToggleButton({ active, baseClass = 'secondary-button', className = '', children, ...rest }: ToggleButtonProps) {
  const cls = [baseClass, active ? 'tab-button--active' : '', className].filter(Boolean).join(' ')
  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  )
}
