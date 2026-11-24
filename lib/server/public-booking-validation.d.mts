export function validDate(value: unknown): value is string
export function validHour(value: unknown): value is string
export function validUuid(value: unknown): value is string
export function isRescheduleRequest(value: unknown): value is { fecha: string; hora: string; staffId: string }
