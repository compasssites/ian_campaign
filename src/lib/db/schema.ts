export type ContactStatus = "pending" | "spoke" | "no_answer" | "callback" | "followed_up";

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  referred_by?: string;
  group_tag?: string;
  shared_interests?: string;
  remarks?: string;
  wa_sent: number;
  email_sent: number;
  created_at: string;
  // joined from latest call_log
  status?: ContactStatus;
  notes?: string;
  called_at?: string;
  called_by?: string;
}

export interface CallLog {
  id: string;
  contact_id: string;
  called_by?: string;
  status: ContactStatus;
  notes?: string;
  called_at: string;
}
