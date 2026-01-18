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
        <div className="max-w-md space-y-6">
            <h1 className="text-3xl font-bold">Настройки</h1>
            
            <div className="space-y-4 rounded-lg border p-4 bg-card">
                <div className="space-y-2">
                    <Label>Базовый URL API</Label>
                    <Input 
                        value={localBaseUrl} 
                        onChange={e => setLocalBaseUrl(e.target.value)} 
                        placeholder="/api" 
                    />
                    <p className="text-xs text-muted-foreground">По умолчанию /api для одного домена.</p>
                </div>

                <div className="space-y-2">
                    <Label>Логин администратора</Label>
                    <Input 
                        value={localUser} 
                        onChange={e => setLocalUser(e.target.value)} 
                    />
                </div>

                <div className="space-y-2">
                    <Label>Пароль администратора</Label>
                    <Input 
                        type="password"
                        value={localPass} 
                        onChange={e => setLocalPass(e.target.value)} 
                    />
                </div>

                <div className="space-y-2">
                    <Label>Тема</Label>
                    <div className="flex gap-2">
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

                <Button onClick={handleSave} className="w-full">Сохранить</Button>
            </div>
        </div>
    );
}
