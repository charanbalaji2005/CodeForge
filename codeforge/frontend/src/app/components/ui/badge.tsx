import * as React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

export const Badge = ({ className = "", variant = "default", ...props }: BadgeProps) => {
  let baseStyles = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold font-mono transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";
  
  let variants = {
    default: "border-transparent bg-white text-black shadow hover:bg-white/80",
    secondary: "border-transparent bg-[#111111] text-white hover:bg-white/10",
    destructive: "border-transparent bg-[#EF4444] text-white hover:bg-[#EF4444]/80",
    outline: "text-white border-white/10"
  };

  return (
    <div className={`${baseStyles} ${variants[variant]} ${className}`} {...props} />
  );
};
Badge.displayName = "Badge";
