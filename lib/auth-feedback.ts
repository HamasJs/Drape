export type AuthMode='sign-in'|'sign-up'|'forgot-password'|'reset-password';
export type AuthFields={email:string;password:string;confirm:string};
export type AuthFieldErrors=Partial<Record<keyof AuthFields,string>>;
export function validEmail(email:string){return email.trim().length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());}
export function validateAuthFields(mode:AuthMode,fields:AuthFields):AuthFieldErrors{
 const errors:AuthFieldErrors={};
 if(mode!=='reset-password'&&!validEmail(fields.email))errors.email='Enter a valid email address.';
 if(mode!=='forgot-password'){
  if(!fields.password)errors.password='Enter your password.';
  else if(fields.password.length>128)errors.password='Use no more than 128 characters.';
  else if(mode!=='sign-in'&&fields.password.length<12)errors.password='Use at least 12 characters.';
 }
 if(mode==='sign-up'||mode==='reset-password'){
  if(!fields.confirm)errors.confirm='Confirm your password.';
  else if(fields.confirm!==fields.password)errors.confirm='Passwords do not match.';
 }
 return errors;
}
export function authErrorMessage(error:unknown,mode:AuthMode):string{
 const value=error as {code?:string;status?:number;name?:string}|null;
 if(value?.status===429||['over_request_rate_limit','over_email_send_rate_limit','over_sms_send_rate_limit'].includes(value?.code||''))return 'Too many attempts. Please wait a few minutes before trying again.';
 if(value?.name==='AuthRetryableFetchError'||value?.name==='TypeError'||value?.name==='TimeoutError'||(value?.status&&value.status>=500))return 'We couldn’t reach the account service. Check your connection and try again.';
 if(value?.code==='email_not_confirmed')return 'Verify your email before signing in. Check your inbox and spam folder, or resend the verification email below.';
 if(['session_not_found','session_expired','refresh_token_not_found','refresh_token_already_used','otp_expired'].includes(value?.code||'')||value?.name==='AuthSessionMissingError')return 'Your session or recovery link has expired. Request a new reset link.';
 if(value?.code==='weak_password')return 'Choose a stronger, unique password with at least 12 characters.';
 if(value?.code==='same_password')return 'Choose a different password from your current one.';
 // Do not reveal whether a submitted email is registered.
 if(mode==='sign-in')return 'Email or password is incorrect. Try again, reset your password, or create an account if you’re new.';
 if(mode==='sign-up')return 'We couldn’t create an account with those details. Try signing in or resetting your password if you already registered.';
 if(mode==='forgot-password')return 'We couldn’t send the reset request. Please try again later.';
 return 'We couldn’t update your password. Request a new reset link and try again.';
}
