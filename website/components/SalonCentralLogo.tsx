export function SalonCentralLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#7C3AED" />
      <path d="M7 10h3.5l3 8 3-8H20l-5 12h-3L7 10z" fill="white" />
      <circle cx="23" cy="17" r="4" fill="#C4B5FD" />
    </svg>
  );
}
