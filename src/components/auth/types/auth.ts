export interface AuthFormData {
  email: string;
  password: string;
}

export interface AuthFormErrors {
  email?: string;
  password?: string;
}

export interface AuthFormProps {
  mode: 'signin' | 'signup';
}

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}