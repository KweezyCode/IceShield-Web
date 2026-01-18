export interface AuditLog {
    id: number;
    username: string;
    ipNum: number | string;
    joincode: string;
    createdAt: number | string;
}

export interface BanEntry {
    type: 'USERNAME' | 'IP' | 'SUBNET' | 'ASN';
    entryId: number;
    value: string;
}

export interface BanDetailDTO {
    detailId: number;
    reason: string;
    bannedBy: string;
    bannedAt: number;
    expiresAt?: number;
    entries: BanEntry[];
}

export interface AddBanRequest {
    targets: { type: string; value: string }[];
    reason?: string;
    expiresAt?: number | null;
}

export interface BanTarget {
    type: string;
    value: string;
}

export interface AuditMeta {
    ok: boolean;
    ip: string;
    countryCode?: string;
    countryName?: string;
    city?: string;
    asn?: number;
    badASN?: boolean;
    cached?: boolean;
}
