interface SpinnerProps {
  size?: 'small' | 'medium' | 'large';
}

export function Spinner({ size = 'medium' }: SpinnerProps) {
  const sizeMap = {
    small: 16,
    medium: 24,
    large: 32
  };

  const dimensions = sizeMap[size];

  return (
    <svg
      className="spinner"
      width={dimensions}
      height={dimensions}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        animation: 'spin 1s linear infinite'
      }}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="var(--muted2)"
        strokeWidth="3"
        fill="none"
      />
      <path
        d="M12 2 A10 10 0 0 1 22 12"
        stroke="var(--accent)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </svg>
  );
}
