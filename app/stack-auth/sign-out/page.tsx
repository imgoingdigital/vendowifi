import { redirect } from 'next/navigation';
// Server page: just route through to API + redirect home.
export default async function SignOutPage() {
  // Let client menu handle API call; here we simply send user home.
  redirect('/');
}
