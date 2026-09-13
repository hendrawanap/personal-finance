import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LABEL_CLASS, controlClass } from './form';

type InputVariant = 'text' | 'email' | 'number' | 'decimal';

interface InputProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'onChange' | 'value' | 'type'
  > {
  label: ReactNode;
  value: string;
  onChange?: (value: string) => void;
  /** 'number' = digit only, 'decimal' = angka + 1 titik desimal */
  variant?: InputVariant;
  error?: string;
  helperText?: string;
  containerClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
}

/** Konfigurasi atribut native per variant */
const VARIANT_ATTRS: Record<
  InputVariant,
  Pick<InputHTMLAttributes<HTMLInputElement>, 'type' | 'inputMode' | 'autoComplete'>
> = {
  text: { type: 'text' },
  email: { type: 'email', inputMode: 'email', autoComplete: 'email' },
  // type="text" sengaja: type="number" native punya banyak quirk
  // (scroll ngubah value, leading zero hilang, e/E dianggap valid)
  number: { type: 'text', inputMode: 'numeric' },
  decimal: { type: 'text', inputMode: 'decimal' },
};

/** Sanitasi value sesuai variant. Return null = tolak perubahan. */
function sanitize(variant: InputVariant, raw: string): string | null {
  switch (variant) {
    case 'number':
      // Strip semua non-digit (paste "Rp 5.000" -> "5000")
      return raw.replace(/\D/g, '');
    case 'decimal': {
      // Normalisasi koma ke titik, strip selain digit & titik
      let v = raw.replace(/,/g, '.').replace(/[^\d.]/g, '');
      // Sisain cuma titik pertama
      const firstDot = v.indexOf('.');
      if (firstDot !== -1) {
        v =
          v.slice(0, firstDot + 1) +
          v.slice(firstDot + 1).replace(/\./g, '');
      }
      return v;
    }
    case 'email':
      // Email jangan divalidasi per-keystroke (user lagi ngetik).
      // Validasi format-nya urusan form layer (zod/RHF) pas submit/blur.
      return raw.replace(/\s/g, ''); // spasi ga pernah valid di email
    default:
      return raw;
  }
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      value,
      onChange,
      variant = 'text',
      error,
      helperText,
      containerClassName,
      labelClassName,
      inputClassName,
      placeholder,
      maxLength,
      readOnly = false,
      disabled = false,
      required = false,
      ...restProps
    },
    ref
  ) => {
    const id = useId();
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;

    const isDisabled = disabled || readOnly;
    const hasError = !!error;
    const showCounter = !!maxLength && !isDisabled;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const sanitized = sanitize(variant, e.target.value);
      if (sanitized === null) return;
      if (maxLength && sanitized.length > maxLength) {
        onChange?.(sanitized.slice(0, maxLength));
        return;
      }
      onChange?.(sanitized);
    };

    return (
      <div className={cn('w-full', containerClassName)}>
        <label
          htmlFor={id}
          className={cn(LABEL_CLASS, 'mb-1.5', labelClassName)}
        >
          {label}
          {required && (
            <span className="ml-0.5 normal-case text-xenia-danger" aria-hidden="true">
              *
            </span>
          )}
        </label>

        <div className="relative">
          <input
            ref={ref}
            id={id}
            value={value}
            onChange={handleChange}
            readOnly={readOnly}
            disabled={disabled}
            maxLength={maxLength}
            placeholder={placeholder}
            required={required}
            aria-invalid={hasError}
            aria-describedby={
              error ? errorId : helperText ? helperId : undefined
            }
            {...VARIANT_ATTRS[variant]}
            className={controlClass(hasError, cn(showCounter && 'pr-16', inputClassName))}
            {...restProps}
          />

          {showCounter && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <span
                className={cn(
                  'text-xs',
                  value.length >= maxLength! ? 'text-xenia-danger' : 'text-xenia-stone-400'
                )}
              >
                {value.length}/{maxLength}
              </span>
            </div>
          )}
        </div>

        {error && (
          <p id={errorId} className="mt-1 text-xs text-xenia-danger" role="alert">
            {error}
          </p>
        )}

        {helperText && !error && (
          <p id={helperId} className="mt-1 text-xs text-xenia-stone-400">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
