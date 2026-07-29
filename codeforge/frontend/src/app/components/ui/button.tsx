import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'primary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "default", ...props }, ref) => {
    let baseStyles = "inline-flex items-center justify-center rounded-lg text-sm font-semibold transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]";
    
    let variants = {
      default: "bg-[#0070F3] text-white hover:bg-[#0070F3]/90 shadow-md shadow-[#0070F3]/10",
      primary: "bg-[#0070F3] text-white hover:bg-[#0070F3]/90 shadow-md shadow-[#0070F3]/10",
      destructive: "bg-[#EF4444] text-white hover:bg-[#EF4444]/90",
      outline: "border border-white/10 bg-transparent text-white hover:bg-white/5",
      secondary: "bg-[#111111] border border-white/10 text-white hover:bg-white/5",
      ghost: "text-white hover:bg-white/5",
      link: "text-white underline-offset-4 hover:underline"
    };

    let sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-9 rounded-md px-3 text-xs",
      lg: "h-11 rounded-md px-8 text-base",
      icon: "h-10 w-10"
    };

    const combinedClassName = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;

    return (
      <button
        className={combinedClassName}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
