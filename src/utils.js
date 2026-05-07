// src/utils.js

// Função simples para ajudar nas classes CSS (usada pelos componentes bonitos)
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Função placeholder para criação de URLs (caso ainda esteja sendo usada)
export function createPageUrl(page) {
  return `/${page}`;
}