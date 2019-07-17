import { RequestQueryBuilder, CondOperator } from "@nestjsx/crud-request";

export type POSSIBLE_ACTIONS =
  | "GET_LIST"
  | "GET_ONE"
  | "GET_MANY"
  | "GET_MANY_REFERENCE"
  | "CREATE"
  | "UPDATE"
  | "UPDATE_MANY"
  | "DELETE"
  | "DELETE_MANY";

export interface ConfigurationEntry {
  requestMutator?(request: { type: POSSIBLE_ACTIONS; resource: string; params: any }): { type: POSSIBLE_ACTIONS; resource: string; params: any; };
  responseMutator?(response: {
    response: any;
    type: POSSIBLE_ACTIONS;
    resource: string;
    params: any;
  }): {
    response: any;
    type: POSSIBLE_ACTIONS;
    resource: string;
    params: any;
  };
}
