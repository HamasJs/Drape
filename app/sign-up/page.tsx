import AuthForm from '../../components/AuthForm';
import { authConfigured } from '../../lib/supabase/config';
export const dynamic='force-dynamic';
export default function Page(){return <AuthForm mode="sign-up" configured={authConfigured()}/>;}
