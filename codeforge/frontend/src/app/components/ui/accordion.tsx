"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

export const Accordion = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`space-y-2 ${className}`}>{children}</div>
);

export const AccordionItem = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`border-b border-white/5 pb-2 ${className}`}>{children}</div>
);

export const AccordionTrigger = ({ 
  children, 
  isOpen, 
  onClick 
}: { 
  children: React.ReactNode; 
  isOpen: boolean; 
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="flex w-full items-center justify-between py-4 text-left font-semibold text-white transition-all hover:text-white/80"
  >
    {children}
    <ChevronDown className={`h-4 w-4 shrink-0 text-[#A1A1AA] transition-transform duration-200 ${isOpen ? "rotate-180 text-white" : ""}`} />
  </button>
);

export const AccordionContent = ({ children, isOpen }: { children: React.ReactNode; isOpen: boolean }) => (
  <div
    className={`overflow-hidden transition-all duration-300 ${
      isOpen ? "max-h-[300px] opacity-100 pb-4" : "max-h-0 opacity-0"
    }`}
  >
    <div className="text-sm text-[#A1A1AA] leading-relaxed">{children}</div>
  </div>
);
