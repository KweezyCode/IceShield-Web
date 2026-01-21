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
            <div className="hidden md:block">
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
                            data.map((ban) => {
                                const isActive = !ban.expiresAt || ban.expiresAt > Date.now();
                                return (
                                    <TableRow key={ban.detailId}>
                                        <TableCell>
                                            <span className={isActive ? "text-green-600" : "text-gray-400"}>
                                                {isActive ? "Да" : "Истёк"}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                {ban.entries.map((e) => (
                                                    <div key={`${e.type}-${e.entryId}`} className="flex items-center justify-between gap-2 text-xs">
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
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="md:hidden p-4 space-y-4">
                {data.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground">Баны не найдены.</div>
                ) : (
                    data.map((ban) => {
                        const isActive = !ban.expiresAt || ban.expiresAt > Date.now();
                        return (
                            <div key={ban.detailId} className="rounded-lg border p-3 space-y-3 transition-shadow duration-200 hover:shadow-sm">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-1">
                                        <div className="text-sm font-semibold">Бан #{ban.detailId}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {ban.bannedBy ? `Кем забанен: ${ban.bannedBy}` : 'Автор не указан'}
                                        </div>
                                    </div>
                                    <span className={`text-xs font-medium ${isActive ? "text-green-600" : "text-gray-400"}`}>
                                        {isActive ? "Активен" : "Истёк"}
                                    </span>
                                </div>

                                <div className="text-sm">
                                    <div className="font-medium">Причина</div>
                                    <div className="text-muted-foreground">{ban.reason || '—'}</div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <div className="font-medium">Дата</div>
                                        <div className="text-muted-foreground">{formatTime(ban.bannedAt)}</div>
                                    </div>
                                    <div>
                                        <div className="font-medium">Истекает</div>
                                        <div className="text-muted-foreground">{ban.expiresAt ? formatTime(ban.expiresAt) : 'Постоянно'}</div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="text-sm font-medium">Цели</div>
                                    <div className="space-y-2">
                                        {ban.entries.map((e) => (
                                            <div key={`${e.type}-${e.entryId}`} className="flex items-start justify-between gap-2 rounded-md bg-muted/30 p-2">
                                                <div className="text-xs">
                                                    <div>
                                                        <span className="font-semibold">{typeLabel(e.type)}:</span> {e.value}
                                                    </div>
                                                    {e.createdBy && (
                                                        <div className="text-muted-foreground">Создал: {e.createdBy}</div>
                                                    )}
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-muted-foreground hover:text-red-500"
                                                    onClick={() => onDeleteEntry(e.type, e.entryId)}
                                                    title="Удалить цель"
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
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
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Удалить бан
                                    </Button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
