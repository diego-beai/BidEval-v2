-- Migration: Add new wizard fields to projects table
-- Adds reference_code, owner_name, and Q&A deadline dates

ALTER TABLE public.projects
    ADD COLUMN IF NOT EXISTS reference_code TEXT,
    ADD COLUMN IF NOT EXISTS owner_name TEXT,
    ADD COLUMN IF NOT EXISTS date_questions_deadline TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS date_questions_response TIMESTAMPTZ;
