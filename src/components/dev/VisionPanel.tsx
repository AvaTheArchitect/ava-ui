import React from 'react';
import VisualFeedbackPanel from '@/components/ui/feedback/VisualFeedbackPanel';

export default function VisionPanel() {
  return (
    <div className="border p-4 bg-white shadow">
      <h2 className="text-xl mb-2">Vision Intelligence</h2>
      <VisualFeedbackPanel />
    </div>
  );
}