/** What the sign-in forms hold between submissions. Nothing here reaches a URL. */
export interface FormState {
  error?: string;
  message?: string;
}

export interface CodeFormState extends FormState {
  step: "email" | "code";
  email?: string;
}

export interface EnrolFormState extends FormState {
  step: "start" | "verify";
  factorId?: string;
  qrCode?: string;
  secret?: string;
}
