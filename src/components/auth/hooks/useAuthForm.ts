import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { z } from 'zod';
import { authSchema } from '../validation/authSchemas';
import type { AuthFormData, AuthFormErrors } from '../types/auth';

export function useAuthForm() {
  const [formData, setFormData] = useState<AuthFormData>({ 
    email: '', 
    password: '' 
  });
  const [errors, setErrors] = useState<AuthFormErrors>({});

  const validateForm = () => {
    try {
      authSchema.parse(formData);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors: AuthFormErrors = {};
        error.errors.forEach((err) => {
          const field = err.path[0];
          if (field === 'email' || field === 'password') {
            formattedErrors[field] = err.message;
          }
        });
        setErrors(formattedErrors);
      }
      return false;
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'email' || name === 'password') {
      if (errors[name]) {
        setErrors(prev => ({ ...prev, [name]: undefined }));
      }
    }
  };

  return {
    formData,
    errors,
    validateForm,
    handleChange,
  };
}