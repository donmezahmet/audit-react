import React from 'react';
import { Input, Select, Textarea, SelectOption } from '@/components/ui';

export interface FormFieldProps {
  name: string;
  label?: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'date' | 'select' | 'textarea';
  placeholder?: string;
  value: any;
  error?: string;
  touched?: boolean;
  required?: boolean;
  disabled?: boolean;
  options?: SelectOption[];
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onBlur?: () => void;
  rows?: number;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  helperText?: string;
}

const FormField: React.FC<FormFieldProps> = ({
  name,
  label,
  type = 'text',
  placeholder,
  value,
  error,
  touched,
  required,
  disabled,
  options,
  onChange,
  onBlur,
  rows = 4,
  leftIcon,
  rightIcon,
  helperText,
}) => {
  const showError = touched && error;

  if (type === 'select' && options) {
    return (
      <Select
        id={name}
        name={name}
        label={label}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        error={showError ? error : undefined}
        helperText={!showError ? helperText : undefined}
        required={required}
        disabled={disabled}
        options={options}
        placeholder={placeholder}
        fullWidth
      />
    );
  }

  if (type === 'textarea') {
    return (
      <Textarea
        id={name}
        name={name}
        label={label}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        error={showError ? error : undefined}
        helperText={!showError ? helperText : undefined}
        required={required}
        disabled={disabled}
        rows={rows}
        fullWidth
      />
    );
  }

  return (
    <Input
      id={name}
      name={name}
      type={type}
      label={label}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      placeholder={placeholder}
      error={showError ? error : undefined}
      helperText={!showError ? helperText : undefined}
      required={required}
      disabled={disabled}
      leftIcon={leftIcon}
      rightIcon={rightIcon}
      fullWidth
    />
  );
};

export default FormField;

