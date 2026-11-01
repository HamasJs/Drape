import { redirect } from 'next/navigation';
import { authConfigured } from '../lib/supabase/config';
import { serverAuth } from '../lib/supabase/server';
import SetupRequired from '../components/SetupRequired';
import QuoteStudio from '../components/QuoteStudio';
export const dynamic='force-dynamic';
export default async function Page(){
 if(!authConfigured())return <SetupRequired/>;
 const auth=await serverAuth();const {data,error}=await auth.auth.getUser();
 if(error||!data.user||!data.user.email_confirmed_at)redirect('/sign-in');
 return <QuoteStudio email={data.user.email||''} accountId={data.user.id}/>;
}
