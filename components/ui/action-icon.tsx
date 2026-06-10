import * as React from "react";
import { cn } from "@/lib/utils";

export type ActionIconName =
  | "bookmark"
  | "check"
  | "chevron-down"
  | "copy"
  | "external"
  | "eye"
  | "folder"
  | "heart"
  | "mail"
  | "maximize"
  | "pencil"
  | "plus"
  | "share"
  | "trash"
  | "upload"
  | "x";

type ActionIconProps = {
  name: ActionIconName;
  filled?: boolean;
  className?: string;
};

type IconControlVariant = "primary" | "secondary" | "ghost" | "danger";

const iconControlVariants: Record<IconControlVariant, string> = {
  primary: "border-[#d9ae19] bg-[#f3c945] text-[#11100e] hover:bg-[#f6d45d]",
  secondary: "border-[#16130f] bg-transparent text-[#11100e] hover:bg-[#ebe3d6]",
  ghost: "border-transparent bg-transparent text-[#4a4337] hover:border-[#d7cebd]",
  danger: "border-red-600 bg-red-600 text-white hover:bg-red-700"
};

export function iconControlClassName({
  active = false,
  className,
  variant = "secondary"
}: {
  active?: boolean;
  className?: string;
  variant?: IconControlVariant;
} = {}) {
  return cn(
    "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-none border transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60",
    iconControlVariants[variant],
    active ? "border-[#d9ae19] bg-[#f3c945] text-[#11100e]" : null,
    className
  );
}

export interface IconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  active?: boolean;
  icon: ActionIconName;
  label: string;
  variant?: IconControlVariant;
}

export function IconButton({
  active = false,
  className,
  icon,
  label,
  type = "button",
  variant = "secondary",
  ...props
}: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={iconControlClassName({ active, className, variant })}
      title={label}
      type={type}
      {...props}
    >
      <ActionIcon filled={active} name={icon} />
    </button>
  );
}

export function ActionIcon({ className, filled = false, name }: ActionIconProps) {
  const common = {
    "aria-hidden": true,
    className: cn("h-4 w-4", className),
    fill: "none",
    viewBox: "0 0 24 24"
  } as const;

  if (name === "bookmark") {
    return (
      <svg {...common} fill={filled ? "currentColor" : "none"}>
        <path
          d="M6 3.75h12a1 1 0 0 1 1 1v16.5l-7-4-7 4V4.75a1 1 0 0 1 1-1Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (name === "heart") {
    return (
      <svg {...common} fill={filled ? "currentColor" : "none"}>
        <path
          d="M12 20.5s-7.5-4.4-9.2-9.1C1.5 7.5 4.1 4 8 4c2 0 3.2 1.1 4 2.3C12.8 5.1 14 4 16 4c3.9 0 6.5 3.5 5.2 7.4-1.7 4.7-9.2 9.1-9.2 9.1Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (name === "eye") {
    return (
      <svg {...common}>
        <path
          d="M2.5 12s3.2-6 9.5-6 9.5 6 9.5 6-3.2 6-9.5 6-9.5-6-9.5-6Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (name === "folder") {
    return (
      <svg {...common}>
        <path
          d="M3.5 7.5A2.5 2.5 0 0 1 6 5h3.4l2 2H18a2.5 2.5 0 0 1 2.5 2.5v7A2.5 2.5 0 0 1 18 19H6a2.5 2.5 0 0 1-2.5-2.5v-9Z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (name === "pencil") {
    return (
      <svg {...common}>
        <path
          d="M4 20h4l10-10a2.12 2.12 0 0 0-3-3L5 17v3Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path d="m14 6 4 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    );
  }

  if (name === "trash") {
    return (
      <svg {...common}>
        <path d="M4 7h16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        <path
          d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7m3 0-.8 12.1A2 2 0 0 1 15.2 21H8.8a2 2 0 0 1-2-1.9L6 7"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (name === "copy") {
    return (
      <svg {...common}>
        <rect height="9" rx="1" stroke="currentColor" strokeWidth="1.8" width="9" x="9" y="9" />
        <path
          d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (name === "external") {
    return (
      <svg {...common}>
        <path d="M14 4h6v6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        <path d="m20 4-9 9" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        <path
          d="M10 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (name === "mail") {
    return (
      <svg {...common}>
        <rect height="14" rx="1.5" stroke="currentColor" strokeWidth="1.8" width="18" x="3" y="5" />
        <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (name === "share") {
    return (
      <svg {...common}>
        <circle cx="18" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="18" cy="19" r="2.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (name === "maximize") {
    return (
      <svg {...common}>
        <path d="M8 4H4v4M16 4h4v4M8 20H4v-4M16 20h4v-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    );
  }

  if (name === "x") {
    return (
      <svg {...common}>
        <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </svg>
    );
  }

  if (name === "plus") {
    return (
      <svg {...common}>
        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </svg>
    );
  }

  if (name === "check") {
    return (
      <svg {...common}>
        <path d="m5 12.5 4.2 4L19 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    );
  }

  if (name === "chevron-down") {
    return (
      <svg {...common}>
        <path d="m6 9 6 6 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path
        d="M12 16V8m0 0 3 3m-3-3-3 3M4 15.5A3.5 3.5 0 0 1 7.5 12h.5A5 5 0 1 1 18 12h.5a3.5 3.5 0 1 1 0 7H7a3 3 0 0 1-3-3Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
