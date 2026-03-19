import { clsx } from 'clsx';
import { inputBaseClasses, inputErrorClasses, inputNormalClasses, STYLE_CLASSES } from './constants';

interface BaseFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helpText?: string;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
  showCharCount?: boolean;
}

interface TextFieldProps extends BaseFieldProps {
  type: 'text' | 'email' | 'tel' | 'url';
}

interface TextAreaFieldProps extends BaseFieldProps {
  type: 'textarea';
  rows?: number;
}

interface SelectFieldProps extends Omit<BaseFieldProps, 'placeholder' | 'maxLength' | 'showCharCount'> {
  type: 'select';
  options: Array<{ value: string; label: string }>;
}

type FormFieldProps = TextFieldProps | TextAreaFieldProps | SelectFieldProps;

export function FormField(props: FormFieldProps) {
  const { id, label, value, onChange, error, helpText, required = false } = props;

  const renderInput = () => {
    const baseInputClasses = clsx(
      inputBaseClasses,
      error ? inputErrorClasses : inputNormalClasses
    );

    switch (props.type) {
      case 'textarea':
        return (
          <textarea
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={props.rows ?? 4}
            placeholder={props.placeholder}
            maxLength={props.maxLength}
            className={clsx(baseInputClasses, "resize-none")}
          />
        );

      case 'select':
        return (
          <select
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={baseInputClasses}
          >
            {props.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      default:
        return (
          <input
            id={id}
            type={props.type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={props.placeholder}
            maxLength={props.maxLength}
            className={baseInputClasses}
          />
        );
    }
  };

  const renderCharCount = () => {
    if (props.type === 'select' || !props.showCharCount || !props.maxLength) {
      return null;
    }

    return (
      <div className={STYLE_CLASSES.helpText}>
        {value.length} / {props.maxLength}
      </div>
    );
  };

  return (
    <div className={STYLE_CLASSES.fieldContainer}>
      <label htmlFor={id} className={STYLE_CLASSES.label}>
        {label}
        {required && <span className={STYLE_CLASSES.required}>*</span>}
      </label>

      {renderInput()}

      {error && (
        <p className={STYLE_CLASSES.error}>{error}</p>
      )}

      {helpText && !error && (
        <p className={STYLE_CLASSES.helpText}>{helpText}</p>
      )}

      {renderCharCount()}
    </div>
  );
}
