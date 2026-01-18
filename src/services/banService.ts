import { api } from "@/lib/api";
import { AddBanRequest, BanDetailDTO, BanTarget } from "./types";

export interface GetBansParams {
    limit?: number;
    offset?: number;
    bannedBy?: string;
    reason?: string;
    active?: boolean;
}

export const banService = {
    checkBan: async (target: BanTarget) => {
         const searchParams = new URLSearchParams();
         searchParams.set(target.type, target.value); // Determine how target is passed. The backend uses generic extraction. 
         // Assuming backend extracts from query params like ?username=foo or ?ip=1.2.3.4
         // But the extracted code shows `BanTargetHttp.extractTarget`.
         // Let's assume params name match type lowercased.
         // Actually `BanTargetHttp` usually checks for `username`, `ip`, `subnet` etc.
         // Let's map type to param name.
         
         let paramName = 'username';
         if(target.type.toLowerCase() === 'ip') paramName = 'ip';
         else if(target.type.toLowerCase() === 'subnet') paramName = 'subnet';
         else if(target.type.toLowerCase() === 'asn') paramName = 'asn';
         
         // If passed correctly
         return api.get<BanDetailDTO>(`/bans/check?${paramName}=${encodeURIComponent(target.value)}`);
    },

    getBans: async (params: GetBansParams) => {
        const searchParams = new URLSearchParams();
        if (params.limit) searchParams.set('limit', params.limit.toString());
        if (params.offset) searchParams.set('offset', params.offset.toString());
        if (params.bannedBy) searchParams.set('bannedBy', params.bannedBy);
        if (params.reason) searchParams.set('reason', params.reason);
        if (params.active !== undefined) searchParams.set('active', String(params.active));
        
        return api.get<BanDetailDTO[]>(`/bans/list?${searchParams.toString()}`);
    },

    addBan: async (data: AddBanRequest) => {
        return api.post<{ status: string; detailId: number; added: number }>('/bans/add', data);
    },

    addTargetsToDetail: async (detailId: number, targets: BanTarget[]) => {
        return api.post<{ status: string; added: number }>("/bans/add-entry", { detailId, targets });
    },

    deleteBanByDetailId: async (detailId: number) => {
        return api.delete<{ deleted: number }>(`/bans/by-detail?detailId=${detailId}`);
    },

    deleteBanByType: async (type: string, entryId: number) => {
        return api.delete<{ deleted: number }>(`/bans/by-type?type=${type}&entryId=${entryId}`);
    }
};
