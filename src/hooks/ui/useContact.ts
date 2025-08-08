// src/hooks/useContact.ts
"use client";

import { useState, useEffect } from "react";

export interface ContactState {
  isLoaded: boolean;
  isActive: boolean;
  handleToggle: () => void;
  handleSubmit: (e: React.FormEvent) => void; // ✅ Added missing function
}

export const useContact = (): ContactState => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isActive, setIsActive] = useState(false);

  // ✅ Set loaded to true after component mounts
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const handleToggle = () => {
    setIsActive(!isActive);
  };

  // ✅ Add missing handleSubmit function
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted!");
    // Add your form submission logic here
  };

  return {
    isLoaded,
    isActive,
    handleToggle,
    handleSubmit, // ✅ Return the missing function
  };
};
