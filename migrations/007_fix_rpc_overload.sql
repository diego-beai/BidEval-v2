-- Migration 007: Fix function overloading in desarrollo schema
-- The 2-param version of get_or_create_project conflicts with the 7-param version
-- causing PostgREST ambiguity. Drop the old 2-param version from both schemas.

-- Drop old 2-param overload from desarrollo (created by migration 005)
DROP FUNCTION IF EXISTS desarrollo.get_or_create_project(TEXT, TEXT);

-- Drop old 2-param overload from public (created by bbdd.sql)
DROP FUNCTION IF EXISTS public.get_or_create_project(TEXT, TEXT);

-- Verify the 7-param versions remain (created by migrations 001/003 for public, 006 for desarrollo)
-- public.get_or_create_project(TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ)
-- desarrollo.get_or_create_project(TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ)
-- Both accept 2 params via DEFAULTs, so backward-compatible calls still work.
