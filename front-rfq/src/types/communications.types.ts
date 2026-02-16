/**
 * Types for the Communications Hub module
 */

export type CommunicationType = 'email' | 'call' | 'meeting' | 'note';

export type CommunicationStatus = 'draft' | 'sent' | 'failed' | 'read' | 'logged' | 'scheduled';

export type TimelineFilterType = 'all' | CommunicationType | 'qa';

export interface Communication {
  id: string;
  project_id: string;
  provider_name: string;
  recipient_email: string | null;
  subject: string;
  body: string;
  tone: string;
  status: CommunicationStatus;
  comm_type: CommunicationType;
  qa_item_ids: string[];
  duration_minutes: number | null;
  participants: string[] | null;
  location: string | null;
  attachments: Record<string, unknown> | null;
  notes: string | null;
  sent_at: string;
  created_at: string;
}

export interface QATimelineItem {
  id: string;
  project_name: string;
  provider_name: string;
  discipline: string;
  question: string;
  status: string;
  importance: string | null;
  response: string | null;
  created_at: string;
}

export interface TimelineItem {
  id: string;
  type: CommunicationType | 'qa';
  date: string;
  data: Communication | QATimelineItem;
}

export interface ProviderStats {
  name: string;
  totalComms: number;
  lastContact: string | null;
}
