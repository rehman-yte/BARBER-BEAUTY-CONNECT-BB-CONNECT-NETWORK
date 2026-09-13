export type UserRoleType = 'customer' | 'partner' | 'admin';

export interface SupportChatMessage {
  id: string;
  sender: 'user' | 'ai' | 'admin';
  text: string;
  timestamp: number;
  isComplaint?: boolean;
  complaintId?: string;
  isOfficialReply?: boolean;
}

export interface SupportComplaint {
  id?: string;
  complaintId: string;
  userId: string;
  userEmail: string;
  userName: string;
  userRole: 'customer' | 'partner';
  category: 'customer' | 'partner';
  issueType: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved';
  adminReply?: string;
  repliedAt?: string;
  createdAt: string;
  updatedAt?: string;
}
