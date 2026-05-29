export interface BulkInviteResult {
  email: string;
  id?: string;
}

export interface BulkInviteResponse {
  invited: BulkInviteResult[];
  skipped: BulkInviteResult[];
}
