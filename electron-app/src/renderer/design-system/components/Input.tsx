import { forwardRef, type InputHTMLAttributes } from 'react'

type InputSize = 'sm' | 'md'

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  size?: InputSize
}

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(' ')
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { size = 'md', className, ...props },
  ref
) {
  return <input ref={ref} {...props} className={cx('ds-input', `ds-input-${size}`, className)} />
})
