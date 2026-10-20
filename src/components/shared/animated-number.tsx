'use client';

import React, { useEffect, useState } from 'react';
import NumberFlow, { type NumberFlowProps } from '@number-flow/react';

interface AnimatedNumberProps extends Omit<NumberFlowProps, 'value'> {
  value: number | string | null | undefined;
  prefix?: string;
  suffix?: string;
  className?: string;
  fallbackDecimals?: number;
}

export function AnimatedNumber({
  value,
  prefix,
  suffix,
  className,
  format,
  fallbackDecimals = 2,
  ...props
}: AnimatedNumberProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  const safeNum = isNaN(num) ? 0 : num;

  if (!mounted) {
    const formatted = format
      ? new Intl.NumberFormat('en-US', format).format(safeNum)
      : safeNum.toFixed(fallbackDecimals);

    return (
      <span className={className}>
        {prefix}
        {formatted}
        {suffix}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-0.5 ${className || ''}`}>
      {prefix && <span>{prefix}</span>}
      <NumberFlow
        value={safeNum}
        format={format || { minimumFractionDigits: fallbackDecimals, maximumFractionDigits: fallbackDecimals }}
        className="font-mono tabular-nums"
        {...props}
      />
      {suffix && <span>{suffix}</span>}
    </span>
  );
}

/**
 * AnimatedQar: Dedicated component for QAR currency with rolling number animation
 */
export function AnimatedQar({
  value,
  className = '',
  suffix = ' QAR',
  prefix = '',
  decimals = 2,
  ...props
}: {
  value: number | string | null | undefined;
  className?: string;
  suffix?: string;
  prefix?: string;
  decimals?: number;
} & Omit<NumberFlowProps, 'value'>) {
  return (
    <AnimatedNumber
      value={value}
      prefix={prefix}
      suffix={suffix}
      className={className}
      fallbackDecimals={decimals}
      format={{ minimumFractionDigits: decimals, maximumFractionDigits: decimals }}
      {...props}
    />
  );
}

/**
 * AnimatedCount: Dedicated component for integer counts, badges, and quantities
 */
export function AnimatedCount({
  value,
  className = '',
  prefix,
  suffix,
  ...props
}: {
  value: number | string | null | undefined;
  className?: string;
  prefix?: string;
  suffix?: string;
} & Omit<NumberFlowProps, 'value'>) {
  return (
    <AnimatedNumber
      value={value}
      prefix={prefix}
      suffix={suffix}
      className={className}
      fallbackDecimals={0}
      format={{ minimumFractionDigits: 0, maximumFractionDigits: 0 }}
      {...props}
    />
  );
}

export default AnimatedNumber;
