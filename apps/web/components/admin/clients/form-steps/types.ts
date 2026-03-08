export interface FormData {
  email: string;
  displayName: string;
  username: string;
  bio: string;
  jobTitle: string;
  company: string;
  industry: string;
  phone: string;
  website: string;
  location: string;
  accountType: 'individual' | 'business' | 'enterprise';
  timezone: string;
  language: string;
}

export interface StepProps {
  formData: FormData;
  errors: Record<string, string>;
  onInputChange: (field: keyof FormData, value: string) => void;
  mode: 'create' | 'edit';
}
