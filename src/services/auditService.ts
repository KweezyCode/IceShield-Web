import { api } from "@/lib/api";
import { AuditLog, AuditMeta } from "./types";

export interface GetAuditsParams {
    username?: string;
    ip?: string;
    limit?: number;
    offset?: number;
}

export const auditService = {
    getAudits: async (params: GetAuditsParams) => {
        const searchParams = new URLSearchParams();
        if (params.username) searchParams.set('username', params.username);
        if (params.ip) searchParams.set('ip', params.ip);
        if (params.limit) searchParams.set('limit', params.limit.toString());
        if (params.offset) searchParams.set('offset', params.offset.toString());
        
        return api.get<AuditLog[]>(`/audit?${searchParams.toString()}`);
    },
    getAuditMeta: async (ips: string[]) => {
        const query = new URLSearchParams();
        query.set('ips', ips.join(','));
        return api.get<AuditMeta[] | AuditMeta>(`/audit-meta/meta?${query.toString()}`);
    }
};
