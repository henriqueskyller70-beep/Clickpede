export function debounce<F extends (...args: any[]) => any>(func: F, delay: number) {
  let timeoutId: NodeJS.Timeout | null = null;

  return function(this: any, ...args: Parameters<F>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  } as F;
}