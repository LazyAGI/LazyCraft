export type QuotaRecord = {
  id: string
  request_type: 'gpu' | 'storage'
  account_name: string
  reason: string
  tenant_name: string
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  processed_at: string
  updated_at: string
  requested_amount: number
}
