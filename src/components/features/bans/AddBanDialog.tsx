import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AddBanRequest } from "@/services/types";
import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import { Gavel, Plus, X, Trash2 } from "lucide-react";

const banSchema = z.object({
    targets: z
        .array(
            z.object({
                type: z.enum(["USERNAME", "IP", "SUBNET", "ASN"]),
                value: z.string().min(1, "Цель обязательна"),
            })
        )
        .min(1, "Нужна хотя бы одна цель"),
    reason: z.string().optional(),
    expiresIn: z.string().optional(), // In format 1d, 1h, etc. or empty for permanent
});

type BanFormValues = z.infer<typeof banSchema>;

interface AddBanDialogProps {
    onAdd: (data: AddBanRequest) => Promise<any>;
    onAddToDetail: (args: { detailId: number; targets: { type: string; value: string }[] }) => Promise<any>;
}

export function AddBanDialog({ onAdd, onAddToDetail }: AddBanDialogProps) {
    const [open, setOpen] = useState(false);
    const { banDraftTargets, banDraftDetailId, openAddBan, setOpenAddBan, clearBanDraft } = useStore();
    const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<BanFormValues>({
        resolver: zodResolver(banSchema),
        defaultValues: { targets: [{ type: "USERNAME", value: "" }] }
    });
    const { fields, append, remove } = useFieldArray({
        control,
        name: "targets"
    });

    useEffect(() => {
        if (openAddBan) {
            setOpen(true);
            if (banDraftTargets.length) {
                reset({
                    targets: banDraftTargets,
                    reason: '',
                    expiresIn: ''
                });
            }
        }
    }, [openAddBan, banDraftTargets, reset]);

    useEffect(() => {
        if (!open) {
            setOpenAddBan(false);
            clearBanDraft();
        }
    }, [open, setOpenAddBan, clearBanDraft]);

    const onSubmit = async (values: BanFormValues) => {
        let expiresAt = null;
        // Simple parsing for now, ideally use a robust parser
        if (values.expiresIn) {
             const val = parseInt(values.expiresIn);
             const now = Date.now();
             if (values.expiresIn.endsWith('d')) expiresAt = now + val * 24 * 3600 * 1000;
             else if (values.expiresIn.endsWith('h')) expiresAt = now + val * 3600 * 1000;
             else if (values.expiresIn.endsWith('m')) expiresAt = now + val * 60 * 1000;
             else expiresAt = now + val * 1000; // default seconds?
        }

        try {
            if (banDraftDetailId) {
                await onAddToDetail({ detailId: banDraftDetailId, targets: values.targets });
            } else {
                const payload: AddBanRequest = {
                    targets: values.targets,
                    reason: values.reason || "",
                    expiresAt
                };
                await onAdd(payload);
            }
            setOpen(false);
            reset();
        } catch (e) {
            console.error(e);
            alert("Не удалось добавить бан");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Gavel className="mr-2 h-4 w-4" />
                    Добавить бан
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{banDraftDetailId ? 'Добавить цель в группу' : 'Новый бан'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Цели</Label>
                        <div className="max-h-64 space-y-2 overflow-auto p-1">
                            {fields.map((field, index) => (
                                <div key={field.id} className="flex gap-2 items-center">
                                    <select
                                        {...register(`targets.${index}.type`)}
                                        className="w-[140px] flex-none flex h-10 items-center justify-between rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"
                                        style={{ backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}
                                    >
                                        <option className="bg-background text-foreground" style={{ backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }} value="USERNAME">Ник</option>
                                        <option className="bg-background text-foreground" style={{ backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }} value="IP">IP-адрес</option>
                                        <option className="bg-background text-foreground" style={{ backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }} value="SUBNET">Подсеть</option>
                                        <option className="bg-background text-foreground" style={{ backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }} value="ASN">ASN</option>
                                    </select>
                                    <Input
                                        className="flex-1 transition-all duration-200"
                                        placeholder="Значение"
                                        {...register(`targets.${index}.value`)}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="flex-none text-red-500 hover:text-red-600 hover:bg-red-500/10 transition-all duration-200"
                                        onClick={() => remove(index)}
                                        disabled={fields.length <= 1}
                                        title="Удалить"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                        {errors.targets && (
                            <p className="text-sm text-red-500">
                                {errors.targets.message || errors.targets.root?.message || 'Проверьте цели'}
                            </p>
                        )}
                        <Button type="button" variant="secondary" onClick={() => append({ type: "USERNAME", value: "" })}>
                            <Plus className="mr-2 h-4 w-4" />
                            Добавить цель
                        </Button>
                    </div>

                    {!banDraftDetailId && (
                        <div className="space-y-2">
                            <Label>Комментарий (необязательно)</Label>
                            <Input {...register("reason")} />
                            {errors.reason && <p className="text-sm text-red-500">{errors.reason.message}</p>}
                        </div>
                    )}

                    {!banDraftDetailId && (
                        <div className="space-y-2">
                            <Label>Срок (например 1d, 2h). Пусто — навсегда.</Label>
                            <Input {...register("expiresIn")} />
                        </div>
                    )}

                    <div className="flex justify-end gap-2">
                                 <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                     <X className="mr-2 h-4 w-4" />
                                     Отмена
                                 </Button>
                                 <Button type="submit" disabled={isSubmitting}>
                                     <Gavel className="mr-2 h-4 w-4" />
                                     {banDraftDetailId ? 'Добавить' : 'Забанить'}
                                 </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
