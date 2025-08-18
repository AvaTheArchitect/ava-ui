// src/app/guitar/page.tsx
'use client';

import Guitar from '@/components/guitar/Guitar';

export default function GuitarPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <Guitar />
        </div>
    );
}