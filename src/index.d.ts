export default function(apiUrl: string, httpClient?: (...args: any) => any): void;
export function encodeParamsInResource(resource: string, params: Pick<import("@nestjsx/crud-request").CreateQueryParams, "join" | "fields">): string;