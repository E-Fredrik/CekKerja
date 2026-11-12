import { AuthForm } from "@/components/auth/AuthForm.tsx";

export default function DaftarPage() {
  return (
    <div className="mx-auto max-w-[76rem] px-4 sm:px-6 lg:px-8 py-12 sm:py-16 flex justify-center">
      <AuthForm mode="signup" />
    </div>
  );
}
