import { useState, useCallback, ChangeEvent } from 'react';

interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  email?: boolean;
  custom?: (value: any) => string | undefined;
}

interface FieldConfig {
  value: any;
  validation?: ValidationRule;
}

type FormConfig<T> = {
  [K in keyof T]: FieldConfig;
};

interface UseFormOptions<T> {
  initialValues: FormConfig<T>;
  onSubmit: (values: T) => void | Promise<void>;
}

interface UseFormReturn<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValid: boolean;
  handleChange: (field: keyof T) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleBlur: (field: keyof T) => () => void;
  handleSubmit: (e: React.FormEvent) => void;
  setFieldValue: (field: keyof T, value: any) => void;
  setFieldError: (field: keyof T, error: string) => void;
  resetForm: () => void;
  validateField: (field: keyof T) => string | undefined;
}

export function useForm<T extends Record<string, any>>({
  initialValues,
  onSubmit,
}: UseFormOptions<T>): UseFormReturn<T> {
  const getInitialValues = () => {
    const values = {} as T;
    Object.keys(initialValues).forEach((key) => {
      values[key as keyof T] = initialValues[key as keyof T].value;
    });
    return values;
  };

  const [values, setValues] = useState<T>(getInitialValues());
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = useCallback(
    (field: keyof T): string | undefined => {
      const fieldConfig = initialValues[field];
      const value = values[field];
      const validation = fieldConfig.validation;

      if (!validation) return undefined;

      if (validation.required && !value) {
        return 'This field is required';
      }

      if (validation.minLength && typeof value === 'string' && value.length < validation.minLength) {
        return `Minimum length is ${validation.minLength}`;
      }

      if (validation.maxLength && typeof value === 'string' && value.length > validation.maxLength) {
        return `Maximum length is ${validation.maxLength}`;
      }

      if (validation.min !== undefined && typeof value === 'number' && value < validation.min) {
        return `Minimum value is ${validation.min}`;
      }

      if (validation.max !== undefined && typeof value === 'number' && value > validation.max) {
        return `Maximum value is ${validation.max}`;
      }

      if (validation.pattern && typeof value === 'string' && !validation.pattern.test(value)) {
        return 'Invalid format';
      }

      if (validation.email && typeof value === 'string') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return 'Invalid email address';
        }
      }

      if (validation.custom) {
        return validation.custom(value);
      }

      return undefined;
    },
    [initialValues, values]
  );

  const validateForm = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    Object.keys(initialValues).forEach((key) => {
      const error = validateField(key as keyof T);
      if (error) {
        newErrors[key as keyof T] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [initialValues, validateField]);

  const handleChange = useCallback(
    (field: keyof T) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
      setValues((prev) => ({ ...prev, [field]: value }));
      
      // Clear error on change
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    },
    [errors]
  );

  const handleBlur = useCallback(
    (field: keyof T) => () => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      const error = validateField(field);
      if (error) {
        setErrors((prev) => ({ ...prev, [field]: error }));
      }
    },
    [validateField]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);

      // Mark all fields as touched
      const allTouched = Object.keys(initialValues).reduce((acc, key) => {
        acc[key as keyof T] = true;
        return acc;
      }, {} as Record<keyof T, boolean>);
      setTouched(allTouched);

      // Validate all fields
      const isValid = validateForm();

      if (isValid) {
        try {
          await onSubmit(values);
        } catch (error) {
          // Form submission error
        }
      }

      setIsSubmitting(false);
    },
    [initialValues, validateForm, onSubmit, values]
  );

  const setFieldValue = useCallback((field: keyof T, value: any) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  const setFieldError = useCallback((field: keyof T, error: string) => {
    setErrors((prev) => ({ ...prev, [field]: error }));
  }, []);

  const resetForm = useCallback(() => {
    setValues(getInitialValues());
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, []);

  const isValid = Object.keys(errors).length === 0;

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    setFieldError,
    resetForm,
    validateField,
  };
}

