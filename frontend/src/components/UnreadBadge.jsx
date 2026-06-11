function UnreadBadge({ count, className = "", dot = false }) {
  if (!count || count <= 0) return null;

  const label = count > 99 ? "99+" : String(count);

  if (dot) {
    return (
      <span
        className={`absolute flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none ring-2 ring-white ${className}`}
        aria-label={`${label} unread messages`}
      >
        {label}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold leading-none ${className}`}
      aria-label={`${label} unread messages`}
    >
      {label}
    </span>
  );
}

export default UnreadBadge;
