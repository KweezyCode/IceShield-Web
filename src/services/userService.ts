import { api } from "@/lib/api";

export const userService = {
    changePassword: async (username: string, password: string) => {
        return api.post<{ status: string }>('/users/change-password', { username, password });
    }
};
