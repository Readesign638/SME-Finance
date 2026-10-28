interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Logo({ className = '', size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'h-8 w-8 rounded-lg',
    md: 'h-10 w-10 rounded-xl',
    lg: 'h-14 w-14 rounded-2xl',
    xl: 'h-20 w-20 rounded-3xl'
  };

  return (
    <img
      src="/logo.svg"
      alt="SME Finance Logo"
      className={`object-contain shadow-sm ${sizeClasses[size]} ${className}`}
    />
  );
}