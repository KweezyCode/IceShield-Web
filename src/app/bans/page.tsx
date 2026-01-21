'use client';

import { useState } from "react";
import { useBans } from "@/hooks/useBans";
import { BanTable } from "@/components/features/bans/BanTable";
import { AddBanDialog } from "@/components/features/bans/AddBanDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store/useStore";
import { ChevronLeft, ChevronRight, Filter, XCircle } from "lucide-react";

export default function BansPage() {
    const [page, setPage] = useState(0);
    const [filters, setFilters] = useState({ bannedBy: '', reason: '', active: true });
    const limit = 20;
    const { setBanDraft } = useStore();

    const { bans, isLoading, addBan, deleteBan, deleteEntry, addTargetsToDetail } = useBans({
        limit,
        offset: page * limit,
        bannedBy: filters.bannedBy || undefined,
        reason: filters.reason || undefined,
        active: filters.active
    });

    const handleDelete = async (detailId: number) => {
        if(confirm("Удалить этот бан?")) {
            await deleteBan(detailId);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Управление банами</h1>
                <AddBanDialog onAdd={addBan} onAddToDetail={addTargetsToDetail} />
            </div>
            
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-center">
                <Input
                    placeholder="Поиск по причине..."
                    value={filters.reason}
                    onChange={(e) => setFilters(prev => ({...prev, reason: e.target.value}))}
                    className="w-full"
                />
                <Input
                    placeholder="Поиск по автору..."
                    value={filters.bannedBy}
                    onChange={(e) => setFilters(prev => ({...prev, bannedBy: e.target.value}))}
                    className="w-full"
                />
                <div className="flex items-center gap-2 justify-start md:justify-end">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setFilters({ bannedBy: '', reason: '', active: true })}
                        title="Очистить фильтры"
                    >
                        <XCircle className="h-5 w-5" />
                    </Button>
                    <Button
                        variant={filters.active ? "default" : "outline"}
                        onClick={() => setFilters(prev => ({...prev, active: !prev.active}))}
                    >
                        <Filter className="mr-2 h-4 w-4" />
                        {filters.active ? "Активные баны" : "Все баны"}
                    </Button>
                </div>
            </div>

            <BanTable 
                data={bans} 
                isLoading={isLoading} 
                onDelete={handleDelete}
                onDeleteEntry={async (type, entryId) => {
                    if (confirm("Удалить эту цель?") ) {
                        await deleteEntry({ type, entryId });
                    }
                }}
                onAddTarget={(detailId) => setBanDraft([{ type: "USERNAME", value: "" }], detailId)}
            />

            <div className="flex flex-wrap items-center justify-end gap-2">
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0 || isLoading}
                >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Назад
                </Button>
                <div className="text-sm">Страница {page + 1}</div>
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPage(p => p + 1)}
                    disabled={(!bans || bans.length < limit) || isLoading}
                >
                    Далее
                    <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
