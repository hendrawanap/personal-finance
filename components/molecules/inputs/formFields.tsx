"use client";

import type { ReactNode } from "react";

import { Field } from "./form";

interface FormFieldsProps {
    label: string;
    error?: string;
    hint?: string;
    required?: boolean;
    htmlFor?: string;
    children: ReactNode;
    className?: string;
}

/** Alias lama dari `Field` (molecules/inputs/form). Dipertahankan untuk pemakai yang ada. */
export function FormFields(props: FormFieldsProps) {
    return <Field {...props} />;
}
