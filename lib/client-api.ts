export async function api<T>(path:string,options:RequestInit={}):Promise<T>{
 const response=await fetch(path,{...options,headers:{'Content-Type':'application/json','x-quote-assistant':'1',...options.headers},cache:'no-store'});
 const body=await response.json();
 if(!response.ok){if(response.status===401){window.location.assign('/sign-in');throw new Error('Your session expired. Please sign in again.');}throw new Error(body.error||'The request could not be completed.');}
 return body as T;
}
