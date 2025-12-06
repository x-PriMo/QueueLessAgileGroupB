interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showBackground?: boolean;
}

export default function Logo({ size = 'md', className, showBackground = true }: LogoProps) {
  const sizeClasses = {
    sm: 'h-20 w-auto',
    md: 'h-40 w-auto', 
    lg: 'h-32 w-auto'
  };

  const finalClassName = className || sizeClasses[size];

  const logoImage = (
    <img 
      src="/static/queuelesslogobg.png" 
      alt="QueueLess" 
      className={finalClassName}
    />
  );

  if (!showBackground) {
    return logoImage;
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded p-0 shadow-sm border border-blue-200/50 inline-block">
      {logoImage}
    </div>
  );
}
