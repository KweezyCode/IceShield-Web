'use client';

import { useStore } from "@/store/useStore";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
    const { baseUrl, auth, theme, setBaseUrl, setAuth, setTheme } = useStore();
    
    // Local state to handle inputs before saving
    const [localBaseUrl, setLocalBaseUrl] = useState('');
    const [localUser, setLocalUser] = useState('');
    const [localPass, setLocalPass] = useState('');

    useEffect(() => {
        setLocalBaseUrl(baseUrl);
        setLocalUser(auth.user);
        setLocalPass(auth.pass);
    }, [baseUrl, auth]);

    const handleSave = () => {
        setBaseUrl(localBaseUrl);
        setAuth(localUser, localPass);
        alert("Настройки сохранены!");
    };

    return (
        <div className="mx-auto w-full max-w-md space-y-6">
            <h1 className="text-3xl font-bold">Настройки</h1>

            <form
                className="space-y-4 rounded-lg border bg-card p-4"
                onSubmit={(e) => {
                    e.preventDefault();
                    handleSave();
                }}
            >
                <div className="space-y-2">
                    <Label htmlFor="baseUrl">Базовый URL API</Label>
                    <Input
                        id="baseUrl"
                        value={localBaseUrl}
                        onChange={e => setLocalBaseUrl(e.target.value)}
                        placeholder="/api"
                    />
                    <p className="text-xs text-muted-foreground">По умолчанию /api для одного домена.</p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="adminUser">Логин администратора</Label>
                    <Input
                        id="adminUser"
                        value={localUser}
                        onChange={e => setLocalUser(e.target.value)}
                        autoComplete="username"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="adminPass">Пароль администратора</Label>
                    <Input
                        id="adminPass"
                        type="password"
                        value={localPass}
                        onChange={e => setLocalPass(e.target.value)}
                        autoComplete="current-password"
                    />
                </div>

                <div className="space-y-2">
                    <Label>Тема</Label>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            variant={theme === 'light' ? 'default' : 'outline'}
                            onClick={() => setTheme('light')}
                        >
                            Светлая
                        </Button>
                        <Button
                            type="button"
                            variant={theme === 'amoled' ? 'default' : 'outline'}
                            onClick={() => setTheme('amoled')}
                        >
                            AMOLED
                        </Button>
                    </div>
                </div>

                <Button type="submit" className="w-full">Сохранить</Button>
            </form>
        </div>
    );
}
