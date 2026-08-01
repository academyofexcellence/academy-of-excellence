/**
 * Helper utilities for Indian Standard Time (IST - Asia/Kolkata UTC+5:30)
 */

export const getISTDateString = (dateInput?: string | Date | number): string => {
  const d = dateInput ? new Date(dateInput) : new Date();
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
};

export const getISTTimeString = (dateInput?: string | Date | number): string => {
  const d = dateInput ? new Date(dateInput) : new Date();
  return d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
};

export const getISTDateTimeString = (dateInput?: string | Date | number): string => {
  const d = dateInput ? new Date(dateInput) : new Date();
  return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });
};
