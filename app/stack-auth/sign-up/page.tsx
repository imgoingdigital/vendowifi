"use client";
import { SignUp } from '@stackframe/stack';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded border bg-white dark:bg-neutral-900 p-6 shadow-sm">
        <h1 className="text-lg font-semibold mb-4">Create Account</h1>
        <SignUp />
      </div>
    </div>
  );
}
