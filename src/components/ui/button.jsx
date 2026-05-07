import React from "react";
import { cn } from "@/utils"; // Usa aquela função utilitária que criamos

export function Button({ className, variant = "default", size = "default", ...props }) {
  const baseStyles = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    default: "bg-orange-600 text-white hover:bg-orange-700 shadow-sm",
    outline: "border border-slate-200 bg-white hover:bg-slate-100 text-slate-900",
    ghost: "hover:bg-slate-100 hover:text-slate-900",
    destructive: "bg-red-500 text-white hover:bg-red-600",
  };

  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    icon: "h-10 w-10",
  };

  const variantClass = variants[variant] || variants.default;
  const sizeClass = sizes[size] || sizes.default;

  // Se der erro no "cn", troque a linha abaixo por: 
  // const finalClass = `${baseStyles} ${variantClass} ${sizeClass} ${className || ""}`;
  const finalClass = cn(baseStyles, variantClass, sizeClass, className);

  return <button className={finalClass} {...props} />;
}