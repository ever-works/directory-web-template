export enum PaymentFlow {
  PAY_AT_START = "pay_at_start",
  PAY_AT_END = "pay_at_end",
}

export enum SubmissionStatus {
  DRAFT = "draft",
  PENDING_PAYMENT = "pending_payment",
  PAID = "paid",
  PUBLISHED = "published",
  REJECTED = "rejected"
}

export interface PaymentFlowConfig {
  id: PaymentFlow;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  darkBgColor: string;
  darkBorderColor: string;
  features: string[];
  benefits: Array<{
    icon: string;
    text: string;
    color: string;
  }>;
  badge?: string;
  isDefault?: boolean;
}

export interface SubmissionData {
  id?: string;
  name: string;
  link: string;
  category: string;
  description: string;
  introduction?: string;
  tags?: string[];
  links?: Array<{
    id: string;
    url: string;
    label: string;
    type: "main" | "secondary";
  }>;
  selectedPlan: string;
  paymentFlow: PaymentFlow;
  status: SubmissionStatus;
  userId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  publishedAt?: Date;
  paymentId?: string;
  adminNotes?: string;
}



