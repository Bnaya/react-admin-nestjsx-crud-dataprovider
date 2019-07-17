export default function(
    apiUrl: string,
    httpClient?: (...args: any) => Promise<any>,
    configuration?: import("./interfaces").ConfigurationEntry
  ): (type: import("./interfaces").POSSIBLE_ACTIONS, resource: string, params: any) => Promise<any>;
  export function encodeParamsInResource(
    resource: string,
    params: Pick<
      import("@nestjsx/crud-request").CreateQueryParams,
      "join" | "fields"
    >
  ): string;
  