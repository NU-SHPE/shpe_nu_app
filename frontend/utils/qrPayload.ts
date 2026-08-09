
export type scanMode = 'in' | 'out';
export const buildQRPayload = (eventId: string, mode: scanMode): string =>
    mode === 'out' ? `${eventId}:out` : eventId;

export const parseQRPayload = (value: string): { eventId: string, mode: scanMode } | null => {
    const trimmed = value.trim();
    if (trimmed == '') return null;

    const [eventId, suffix] = trimmed.split(':');
    if (!eventId) {
        return null
    }

    if (suffix && suffix !== 'out') return null

    return { eventId, mode: suffix === 'out' ? 'out' : 'in'};
}