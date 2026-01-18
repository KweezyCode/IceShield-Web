import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { banService, GetBansParams } from "@/services/banService";
import { AddBanRequest, BanTarget } from "@/services/types";

export function useBans(params: GetBansParams) {
    const queryClient = useQueryClient();

    const bansQuery = useQuery({
        queryKey: ['bans', params],
        queryFn: () => banService.getBans(params),
        placeholderData: (previousData) => previousData
    });

    const addBanMutation = useMutation({
        mutationFn: (data: AddBanRequest) => banService.addBan(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bans'] });
        }
    });

    const deleteBanMutation = useMutation({
        mutationFn: (detailId: number) => banService.deleteBanByDetailId(detailId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bans'] });
        }
    });

    const deleteEntryMutation = useMutation({
        mutationFn: ({ type, entryId }: { type: string; entryId: number }) => banService.deleteBanByType(type, entryId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bans'] });
        }
    });

    const addTargetsMutation = useMutation({
        mutationFn: ({ detailId, targets }: { detailId: number; targets: BanTarget[] }) => banService.addTargetsToDetail(detailId, targets),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bans'] });
        }
    });

    return {
        bans: bansQuery.data || [],
        isLoading: bansQuery.isLoading,
        isError: bansQuery.isError,
        addBan: addBanMutation.mutateAsync,
        addTargetsToDetail: addTargetsMutation.mutateAsync,
        deleteBan: deleteBanMutation.mutateAsync,
        deleteEntry: deleteEntryMutation.mutateAsync,
        isAdding: addBanMutation.isPending,
        isDeleting: deleteBanMutation.isPending || deleteEntryMutation.isPending
    };
}
