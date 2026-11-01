"use client";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
export default function PasswordField({
  id,
  label,
  value,
  onChange,
  error,
  disabled,
  autoComplete,
  onBlur,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  autoComplete: "current-password" | "new-password";
  onBlur?: () => void;
}) {
  const [visible, setVisible] = useState(false),
    [capsLock, setCapsLock] = useState(false);
  return (
    <div className="password-field">
      <label htmlFor={id}>{label}</label>
      <div className={`password-input${error ? " input-invalid" : ""}`}>
        <input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          maxLength={128}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          onKeyUp={(e) => setCapsLock(e.getModifierState("CapsLock"))}
          onBlur={() => {
            setCapsLock(false);
            onBlur?.();
          }}
        />
        <button
          type="button"
          className="password-toggle"
          aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
          aria-controls={id}
          aria-pressed={visible}
          disabled={disabled}
          onClick={() => setVisible((previous) => !previous)}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          <span>{visible ? "Hide" : "Show"}</span>
        </button>
      </div>
      {error && (
        <span id={`${id}-error`} className="field-error">
          {error}
        </span>
      )}
      {capsLock && (
        <span className="caps-lock" role="status">
          Caps Lock is on.
        </span>
      )}
    </div>
  );
}
