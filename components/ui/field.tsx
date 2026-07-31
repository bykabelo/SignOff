import * as React from "react";

const base =
  "w-full rounded-soft border-hairline border-line bg-white px-4 py-3 text-[15px] text-ink outline-none placeholder:text-faint focus:border-ink";

export function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-sm text-muted">{children}</span>;
}

export const TextInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function TextInput({ className = "", ...props }, ref) {
  return <input ref={ref} className={`${base} ${className}`} {...props} />;
});

export const TextArea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function TextArea({ className = "", ...props }, ref) {
  return (
    <textarea ref={ref} className={`${base} resize-y ${className}`} {...props} />
  );
});

export function FieldError({ children }: { children?: string | null }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="rounded-soft bg-changes-bg px-4 py-3 text-sm text-changes-fg"
    >
      {children}
    </p>
  );
}

/**
 * Primary action. Full opacity at rest, always — the interface rule is that
 * a control is never revealed by hover, only deepened by it.
 */
export function PrimaryButton({
  accent,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { accent?: string }) {
  return (
    <button
      className={`rounded-soft px-5 py-3 text-sm font-medium text-white transition-opacity disabled:opacity-60 ${className}`}
      style={{ backgroundColor: accent ?? "#2c2c2a" }}
      {...props}
    />
  );
}

export function SecondaryButton({
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`hover-emphasis rounded-soft border-hairline border-line bg-white px-5 py-3 text-sm font-medium text-ink transition-opacity disabled:opacity-60 ${className}`}
      {...props}
    />
  );
}
