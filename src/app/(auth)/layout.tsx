import React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-purple-50/20 to-stone-100 flex items-center justify-center p-4">
      {children}
    </div>
  );
}
