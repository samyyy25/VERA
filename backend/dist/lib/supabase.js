"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const env_1 = require("../config/env");
let supabaseClient = null;
const getSupabase = () => {
    if (supabaseClient) {
        return supabaseClient;
    }
    const { url, serviceRoleKey, anonKey } = env_1.config.supabase;
    const key = serviceRoleKey || anonKey;
    if (!url || !key || url.includes('placeholder')) {
        return null;
    }
    try {
        supabaseClient = (0, supabase_js_1.createClient)(url, key, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        });
        return supabaseClient;
    }
    catch (error) {
        console.error('Failed to initialize Supabase client:', error);
        return null;
    }
};
exports.getSupabase = getSupabase;
