-- Migration: Create qa_notifications table for tracking supplier response events
-- Run this in Supabase SQL Editor

-- Create the qa_notifications table
CREATE TABLE IF NOT EXISTS qa_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    provider_name TEXT NOT NULL,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('supplier_responded', 'evaluation_updated', 'questions_sent')),
    title TEXT NOT NULL,
    message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_qa_notifications_project_id ON qa_notifications(project_id);
CREATE INDEX IF NOT EXISTS idx_qa_notifications_is_read ON qa_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_qa_notifications_created_at ON qa_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qa_notifications_type ON qa_notifications(notification_type);

-- Enable Row Level Security (optional, uncomment if using RLS)
-- ALTER TABLE qa_notifications ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust as needed for your auth setup)
-- CREATE POLICY "Allow all operations on qa_notifications" ON qa_notifications FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON qa_notifications TO authenticated;
GRANT ALL ON qa_notifications TO anon;

-- Add comment for documentation
COMMENT ON TABLE qa_notifications IS 'Stores notifications for Q&A events like supplier responses and evaluation updates';
COMMENT ON COLUMN qa_notifications.notification_type IS 'Type of notification: supplier_responded, evaluation_updated, questions_sent';
COMMENT ON COLUMN qa_notifications.metadata IS 'Additional data like question_ids, response_count, etc.';
