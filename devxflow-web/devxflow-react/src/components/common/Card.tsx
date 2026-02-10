import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '../../utils/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'outline'
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variants = {
      default: 'bg-[#1e293b] border border-[#334155]',
      glass: 'glass-card',
      outline: 'border-2 border-[#334155] bg-transparent'
    }

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl p-6 transition-all duration-200',
          variants[variant],
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 pb-4', className)}
      {...props}
    >
      {children}
    </div>
  )
)

CardHeader.displayName = 'CardHeader'

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, children, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        'text-xl font-semibold leading-none tracking-tight text-[#f8fafc]',
        className
      )}
      {...props}
    >
      {children}
    </h3>
  )
)

CardTitle.displayName = 'CardTitle'

interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, children, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-[#94a3b8]', className)}
      {...props}
    >
      {children}
    </p>
  )
)

CardDescription.displayName = 'CardDescription'

interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('pt-0', className)} {...props}>
      {children}
    </div>
  )
)

CardContent.displayName = 'CardContent'

interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}

const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center pt-4 mt-4 border-t border-[#334155]', className)}
      {...props}
    >
      {children}
    </div>
  )
)

CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
