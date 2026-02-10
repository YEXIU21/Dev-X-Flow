import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../utils/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'flex w-full rounded-lg border border-[#334155] bg-[#0f172a] px-4 py-2.5',
            'text-[#f8fafc] placeholder:text-[#64748b]',
            'focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent',
            'transition-all duration-200',
            error && 'border-red-500 focus:ring-red-500',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-sm text-red-400">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }
