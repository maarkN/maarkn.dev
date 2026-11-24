import { useId, type ComponentProps, type ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { HoloFrame } from "./frame";
import styles from "./holo.module.css";

type Own = {
  /** Visible, and the accessible name. */
  label: string;
  hint?: ReactNode;
  error?: ReactNode;
};

type FieldProps = Own &
  (
    | ({ multiline?: false } & ComponentProps<"input">)
    | ({ multiline: true } & ComponentProps<"textarea">)
  );

/** A labelled text field. `hint` and `error` describe it; an error is announced. */
export function HoloField({ label, hint, error, multiline, id, ...props }: FieldProps) {
  const generated = useId();
  const fieldId = id ?? generated;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const shared = {
    id: fieldId,
    className: styles.input,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": [hintId, errorId].filter(Boolean).join(" ") || undefined,
  };

  return (
    <div>
      <label htmlFor={fieldId} className={styles.fieldLabel}>
        {label}
      </label>
      {hint && (
        <p id={hintId} className={styles.fieldHint}>
          {hint}
        </p>
      )}
      <div
        className={`${styles.holo} ${styles.fieldBox}`}
        data-holo=""
        data-invalid={error ? "" : undefined}
        data-disabled={props.disabled ? "" : undefined}
      >
        <HoloFrame seed={label} />
        {multiline ? (
          <textarea {...(props as ComponentProps<"textarea">)} {...shared} />
        ) : (
          <input {...(props as ComponentProps<"input">)} {...shared} />
        )}
      </div>
      <div role="alert">
        {error && (
          <p id={errorId} className={styles.fieldError}>
            <CircleAlert aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}
      </div>
    </div>
  );
}
