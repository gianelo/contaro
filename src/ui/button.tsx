"use client";

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
