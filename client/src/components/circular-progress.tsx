interface CircularProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
}

export function CircularProgress({ value, size = 200, strokeWidth = 12 }: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  const getColor = (score: number) => {
    if (score < 30) return 'hsl(var(--chart-2))';
    if (score < 70) return 'hsl(var(--chart-4))';
    return 'hsl(var(--destructive))';
  };

  return (
    <div className="relative" style={{ width: size, height: size }} data-testid="circular-progress">
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getColor(value)}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl font-bold" data-testid="text-progress-value">
            {value}%
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            AI Score
          </div>
        </div>
      </div>
    </div>
  );
}
