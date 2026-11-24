import type { AnswerValue, OrganizationActivity } from './demo-data'
export type PortalUser={id:string; username:string; name:string; role:'awardee'|'coordinator'|'institution'|'ministry'; roleLabel:string}
export type StoredDraft={periodId:string;reportId:string|null;month:number;year:number;status:string;isOpen:boolean;version:number;savedAt:string|null;answers:Record<string,AnswerValue>;activities:OrganizationActivity[]}
export type PortalSession = {
  user: import('./demo-data').DemoAccount
  state: import('./demo-data').DemoState
  drafts: StoredDraft[]
  activePeriod: { month: number; year: number } | null
}
