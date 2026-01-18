'use client';

import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { 
    ContextMenu, 
    ContextMenuContent, 
    ContextMenuItem, 
    ContextMenuTrigger 
} from "@/components/ui/context-menu";
import { AuditLog, AuditMeta } from "@/services/types";
import { format, isValid } from "date-fns";
import { useStore } from "@/store/useStore";
import { useRouter } from "next/navigation";
import { Gavel, Copy } from "lucide-react";
import { auditService } from "@/services/auditService";
import { useEffect, useMemo, useState } from "react";

interface AuditTableProps {
    data: AuditLog[];
    isLoading: boolean;
}

export function AuditTable({ data, isLoading }: AuditTableProps) {
    const { setBanDraft } = useStore();
    const router = useRouter();
    const [metaMap, setMetaMap] = useState<Record<string, AuditMeta>>({});

    const formatTime = (value: number | string) => {
        const n = typeof value === 'string' ? Number(value) : value;
        if (!Number.isFinite(n)) return '—';
        const ts = n < 1e12 ? n * 1000 : n;
        const date = new Date(ts);
        if (!isValid(date)) return '—';
        return format(date, 'yyyy-MM-dd HH:mm:ss');
    };

    const rowClass = (code: string) => {
        switch (code) {
            case 'CREATED_ACCOUNT':
                return 'bg-yellow-500/10';
            case 'FAILED':
                return 'bg-red-500/12';
            case 'JOINED_WITH_PASSWORD':
            case 'JOINED_WITHOUT_PASSWORD':
                return 'bg-emerald-500/10';
            case 'DISALLOWED':
                return 'bg-zinc-500/15';
            default:
                return '';
        }
    };

    const toIpv4 = (value: number | string) => {
        const n = typeof value === 'string' ? Number(value) : value;
        if (!Number.isFinite(n)) return '—';
        const u = Math.trunc(n) >>> 0;
        const a = (u >>> 24) & 255;
        const b = (u >>> 16) & 255;
        const c = (u >>> 8) & 255;
        const d = u & 255;
        return [a, b, c, d].join('.');
    };

    const ipList = useMemo(() => {
        const set = new Set<string>();
        for (const item of data) {
            const ip = toIpv4(item.ipNum);
            if (ip && ip !== '—') set.add(ip);
        }
        return Array.from(set);
    }, [data]);

    useEffect(() => {
        const load = async () => {
            const missing = ipList.filter((ip) => !metaMap[ip]);
            if (!missing.length) return;
            const chunks: string[][] = [];
            for (let i = 0; i < missing.length; i += 200) {
                chunks.push(missing.slice(i, i + 200));
            }
            for (const chunk of chunks) {
                try {
                    const res = await auditService.getAuditMeta(chunk);
                    const arr = Array.isArray(res) ? res : [res];
                    setMetaMap((prev) => {
                        const next = { ...prev };
                        for (const m of arr) {
                            if (m && m.ip) next[m.ip] = m;
                        }
                        return next;
                    });
                } catch {
                    // ignore meta errors
                }
            }
        };
        if (ipList.length) void load();
    }, [ipList, metaMap]);

    const countryFlagEmoji = (code?: string) => {
        if (!code || code === 'UNKNOWN') return '🌐';
        const cc = code.trim().toUpperCase();
        if (cc.length !== 2) return '🌐';
        const A = 0x1f1e6;
        const chars = [...cc].map((c) => String.fromCodePoint(A + c.charCodeAt(0) - 65));
        return chars.join('');
    };

    const formatCountry = (m?: AuditMeta) => {
        if (!m || !m.countryCode) return '🌐 —';
        const flag = countryFlagEmoji(m.countryCode);
        let code = m.countryCode.toUpperCase();
        if (code === 'UNKNOWN') code = 'UN'; 
        if (code.length > 2) code = code.substring(0, 2);
        
        const city = (m.city || '').trim();
        return city && city !== 'None' ? `${flag} ${code} — ${city}` : `${flag} ${code}`;
    };

    const asnLabel = (m?: AuditMeta) => {
        const asn = Number(m?.asn || 0);
        return asn > 0 ? `AS${asn}` : '—';
    };

    const asnStatus = (m?: AuditMeta) => {
        if (!m) return 'unknown';
        if (typeof m.badASN !== 'boolean') return 'unknown';
        return m.badASN ? 'bad' : 'ok';
    };

    const copyToClipboard = (text: string) => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text);
            // Could add toast here
        }
    };

    if (isLoading) {
        return <div className="p-4 text-center">Загрузка журнала аудита...</div>;
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur-md">
                    <TableRow className="bg-background/95 backdrop-blur-md">
                        <TableHead>Проверки</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>IP</TableHead>
                        <TableHead>Страна</TableHead>
                        <TableHead>ASN</TableHead>
                        <TableHead>Время записи</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center h-24">
                                Нет данных.
                            </TableCell>
                        </TableRow>
                    ) : (
                        data.map((log) => (
                            <ContextMenu key={log.id}>
                                <ContextMenuTrigger asChild>
                                    <TableRow className={`cursor-pointer ${rowClass(log.joincode)} animate-fade-in`}>
                                        <TableCell className="whitespace-nowrap">
                                            <span
                                                className={`inline-flex min-w-[40px] items-center justify-center rounded-sm border px-2 py-0.5 text-[10px] font-semibold uppercase ${
                                                    asnStatus(metaMap[toIpv4(log.ipNum)]) === 'bad'
                                                        ? 'border-red-500 bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.6)]'
                                                        : asnStatus(metaMap[toIpv4(log.ipNum)]) === 'ok'
                                                            ? 'border-muted-foreground/40 text-muted-foreground'
                                                            : 'border-dashed border-muted-foreground/50 text-muted-foreground'
                                                }`}
                                                title="ASN"
                                            >
                                                ASN
                                            </span>
                                        </TableCell>
                                        <TableCell>{log.username}</TableCell>
                                        <TableCell className="font-mono">{toIpv4(log.ipNum)}</TableCell>
                                        <TableCell>{formatCountry(metaMap[toIpv4(log.ipNum)])}</TableCell>
                                        <TableCell className="font-mono">{asnLabel(metaMap[toIpv4(log.ipNum)])}</TableCell>
                                        <TableCell className="whitespace-nowrap">
                                            {formatTime(log.createdAt)}
                                        </TableCell>
                                    </TableRow>
                                </ContextMenuTrigger>
                                <ContextMenuContent>
                                    <ContextMenuItem onClick={() => copyToClipboard(log.username)}>
                                        <Copy className="mr-2 h-4 w-4" />
                                        Копировать пользователя
                                    </ContextMenuItem>
                                    <ContextMenuItem onClick={() => copyToClipboard(String(log.ipNum))}>
                                        <Copy className="mr-2 h-4 w-4" />
                                        Копировать IP (число)
                                    </ContextMenuItem>
                                    <ContextMenuItem onClick={() => copyToClipboard(toIpv4(log.ipNum))}>
                                        <Copy className="mr-2 h-4 w-4" />
                                        Копировать IP
                                    </ContextMenuItem>
                                    <ContextMenuItem onClick={() => {
                                        setBanDraft([{ type: 'USERNAME', value: log.username }]);
                                        router.push('/bans');
                                    }}>
                                        <Gavel className="mr-2 h-4 w-4" />
                                        Забанить пользователя
                                    </ContextMenuItem>
                                    <ContextMenuItem onClick={() => {
                                        setBanDraft([{ type: 'IP', value: toIpv4(log.ipNum) }]);
                                        router.push('/bans');
                                    }}>
                                        <Gavel className="mr-2 h-4 w-4" />
                                        Забанить IP
                                    </ContextMenuItem>
                                </ContextMenuContent>
                            </ContextMenu>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

