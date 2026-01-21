'use client';

import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { BanDetailDTO } from "@/services/types";
import { format, isValid } from "date-fns";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, X } from "lucide-react";

interface BanTableProps {
    data: BanDetailDTO[];
    isLoading: boolean;
    onDelete: (id: number) => void;
    onDeleteEntry: (type: string, entryId: number) => void;
    onAddTarget: (detailId: number) => void;
}

export function BanTable({ data, isLoading, onDelete, onDeleteEntry, onAddTarget }: BanTableProps) {
    if (isLoading) {
        return <div className="p-4 text-center">Загрузка банов...</div>;
    }

    const formatTime = (value?: number) => {
        if (!value) return '—';
        const ts = value < 1e12 ? value * 1000 : value;
        const date = new Date(ts);
        if (!isValid(date)) return '—';
        return format(date, 'yyyy-MM-dd HH:mm');
    };

    const typeLabel = (type: string) => {
        switch (type) {
            case 'USERNAME':
                return 'Ник';
            case 'IP':
                return 'IP';
            case 'SUBNET':
                return 'Подсеть';
            case 'ASN':
                return 'ASN';
            default:
                return type;
        }
    };

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Активен</TableHead>
                        <TableHead>Цели</TableHead>
                        <TableHead>Причина</TableHead>
                        <TableHead>Кем забанен</TableHead>
                        <TableHead>Дата</TableHead>
                        <TableHead>Истекает</TableHead>
                        <TableHead>Действия</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center h-24">
                                Баны не найдены.
                            </TableCell>
                        </TableRow>
                    ) : (
                        data.map((ban) => (
                            <TableRow key={ban.detailId}>
                                <TableCell>
                                    {/* Logic to determine if active should be better, but assuming data is filtered or we check dates */}
                                    <span className={(!ban.expiresAt || ban.expiresAt > Date.now()) ? "text-green-600" : "text-gray-400"}>
                                        {(!ban.expiresAt || ban.expiresAt > Date.now()) ? "Да" : "Истёк"}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-1">
                                        {ban.entries.map((e, idx) => (
                                            <div key={idx} className="flex items-center justify-between gap-2 text-xs">
                                                <div>
                                                    <span className="font-semibold">{typeLabel(e.type)}:</span> {e.value}
                                                    {e.createdBy && (
                                                        <span className="text-muted-foreground">{' '}• создал: {e.createdBy}</span>
                                                    )}
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-muted-foreground hover:text-red-500"
                                                    onClick={() => onDeleteEntry(e.type, e.entryId)}
                                                    title="Удалить цель"
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </TableCell>
                                <TableCell>{ban.reason}</TableCell>
                                <TableCell>{ban.bannedBy}</TableCell>
                                <TableCell className="whitespace-nowrap">
                                    {formatTime(ban.bannedAt)}
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                    {ban.expiresAt ? formatTime(ban.expiresAt) : 'Постоянно'}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => onAddTarget(ban.detailId)}
                                        >
                                            <Plus className="mr-2 h-4 w-4" />
                                            Добавить цель
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="text-red-500 hover:text-red-700"
                                            onClick={() => onDelete(ban.detailId)}
                                            title="Удалить всю группу"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
