'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { auditService } from "@/services/auditService";
import { AuditTable } from "@/components/features/audit/AuditTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

export default function AuditPage() {
    const [filters, setFilters] = useState({ username: '', ip: '' });
    const limit = 50;
    const listRef = useRef<HTMLDivElement | null>(null);
    const isInitialScroll = useRef(true);
    const prevScrollHeight = useRef(0);
    const prevScrollTop = useRef(0);
    const pendingPrepend = useRef(false);
    const autoScrollRef = useRef(true);
    const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
        queryKey: ['audit', filters],
        initialPageParam: 0,
        queryFn: ({ pageParam }) => auditService.getAudits({
            limit,
            offset: Number(pageParam) * limit,
            username: filters.username || undefined,
            ip: filters.ip || undefined
        }),
        getNextPageParam: (lastPage, allPages) => {
            return lastPage && lastPage.length === limit ? allPages.length : undefined;
        }
    });

    const rows = useMemo(() => {
        const pages = data?.pages || [];
        return pages
            .slice()
            .reverse()
            .flatMap((page) => page.slice().reverse());
    }, [data]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        // Refetch is triggered by filters state
    };

    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
        isInitialScroll.current = true;
    }, [filters.username, filters.ip]);

    useEffect(() => {
        const el = listRef.current;
        if (!el) return;

        if (isInitialScroll.current && rows.length) {
            el.scrollTop = el.scrollHeight;
            isInitialScroll.current = false;
            return;
        }

        if (pendingPrepend.current) {
            const nextHeight = el.scrollHeight;
            el.scrollTop = prevScrollTop.current + (nextHeight - prevScrollHeight.current);
            pendingPrepend.current = false;
            return;
        }

        if (autoScrollRef.current) {
            el.scrollTop = el.scrollHeight;
        }
    }, [rows]);

    return (
        <div className="flex h-full flex-col gap-4">
            <h1 className="text-3xl font-bold tracking-tight">Журнал аудита</h1>

            <div
                ref={listRef}
                className="flex-1 overflow-auto"
                onScroll={(e) => {
                    const target = e.currentTarget;
                    const atBottom = target.scrollHeight - (target.scrollTop + target.clientHeight) <= 120;
                    autoScrollRef.current = atBottom;
                    if (
                        hasNextPage &&
                        !isFetchingNextPage &&
                        target.scrollTop <= 120
                    ) {
                        prevScrollHeight.current = target.scrollHeight;
                        prevScrollTop.current = target.scrollTop;
                        pendingPrepend.current = true;
                        fetchNextPage();
                    }
                }}
            >
                <AuditTable data={rows} isLoading={isLoading} />
                {isFetchingNextPage && (
                    <div className="p-4 text-center text-sm text-muted-foreground">Загрузка...</div>
                )}
            </div>

            <form onSubmit={handleSearch} className="mt-2 flex gap-4 border-t bg-background/95 backdrop-blur-md p-2">
                <Input 
                    placeholder="Фильтр по пользователю..." 
                    value={filters.username}
                    onChange={(e) => setFilters(prev => ({...prev, username: e.target.value}))}
                    className="max-w-xs"
                />
                <Input 
                    placeholder="Фильтр по IP..." 
                    value={filters.ip}
                    onChange={(e) => setFilters(prev => ({...prev, ip: e.target.value}))}
                    className="max-w-xs"
                />
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setFilters({ username: '', ip: '' })}
                    title="Очистить фильтры"
                >
                    <XCircle className="h-5 w-5" />
                </Button>
            </form>
        </div>
    );
}
