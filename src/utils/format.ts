export const isHttpUrl = (s?: string) => !!s && /^https?:\/\//i.test(s);
