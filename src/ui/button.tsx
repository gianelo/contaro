"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./button.module.css";
import { cx } from "./cx";
import { hitTarget } from "./hit-target";

export type ButtonVariant = "primary" | "destructive" | "plain";

export type ButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "className"
> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

export function Button({
  variant = "primary",
  type = "button",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      className={cx(hitTarget, styles.button, styles[variant])}
    >
      {children}
    </button>
  );
}

export type ButtonLinkProps = {
  href: string;
  variant?: ButtonVariant;
  children: ReactNode;
};

/**
 * A button that goes somewhere. It is a link, not a button, because that is
 * what it does: it can be opened in a new tab, and it works before any
 * JavaScript has loaded. Only the clothes are shared.
 */
export function ButtonLink({
  href,
  variant = "primary",
  children,
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={cx(hitTarget, styles.button, styles[variant])}
    >
      {children}
    </Link>
  );
}
