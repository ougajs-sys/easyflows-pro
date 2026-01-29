import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isValid, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely format a date string or Date object.
 * Returns fallback if the date is invalid (prevents crashes on mobile Safari).
 */
export function safeFormatDate(
  dateInput: string | Date | null | undefined,
  formatString: string = "dd/MM/yyyy",
  fallback: string = "-"
): string {
  if (!dateInput) return fallback;
  
  try {
    let date: Date;
    
    if (typeof dateInput === "string") {
      // Try parsing as ISO string first
      date = parseISO(dateInput);
      // If parseISO fails, try native Date constructor
      if (!isValid(date)) {
        date = new Date(dateInput);
      }
    } else {
      date = dateInput;
    }
    
    if (!isValid(date)) {
      console.warn("Invalid date:", dateInput);
      return fallback;
    }
    
    return format(date, formatString, { locale: fr });
  } catch (error) {
    console.warn("Error formatting date:", dateInput, error);
    return fallback;
  }
}
