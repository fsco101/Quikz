import React, { useEffect, useState } from "react";
export function Avatar({
  userId,
  name,
  url,
  size = "h-9 w-9",
}: {
  userId?: string;
  name: string;
  url?: string;
  size?: string;
}) {
  const src = url || (userId ? `/api/users/${userId}/avatar` : undefined);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return (
    <span
      className={`${size} shrink-0 inline-flex rounded-full overflow-hidden items-center justify-center bg-indigo-100 text-indigo-800 font-bold`}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={`${name}'s avatar`}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-label={`${name}'s avatar`}>
          {name
            .trim()
            .split(/\s+/)
            .map((part) => part[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()}
        </span>
      )}
    </span>
  );
}
