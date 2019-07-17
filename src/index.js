import { RequestQueryBuilder, CondOperator } from "@nestjsx/crud-request";
import {
  fetchUtils,
  GET_LIST,
  GET_ONE,
  GET_MANY,
  GET_MANY_REFERENCE,
  CREATE,
  UPDATE,
  UPDATE_MANY,
  DELETE,
  DELETE_MANY
} from "ra-core";

/**
 * @param {any} apiUrl
 * @param {any} httpClient
 * @param {import("./interfaces").ConfigurationEntry} configuration
 */
export default function createNestjsxCrudClient(
  apiUrl,
  httpClient = fetchUtils.fetchJson,
  configuration = {}
) {
  /**
   * @param {any} paramsFilter
   */
  function composeFilter(paramsFilter) {
    const flatFilter = fetchUtils.flattenObject(paramsFilter);
    const filter = Object.keys(flatFilter).map(key => {
      const splitKey = key.split("||");
      const ops = splitKey[1] ? splitKey[1] : CondOperator.CONTAINS;
      let field = splitKey[0];

      if (field.indexOf("_") === 0 && field.indexOf(".") > -1) {
        field = field.split(/\.(.+)/)[1];
      }
      return { field, operator: ops, value: flatFilter[key] };
    });
    return filter;
  }

  /**
   * @param {any} type
   * @param {string} resource
   * @param {{ pagination: { page: any; perPage: any; }; filter: any; sort: { field: string; order: "ASC" | "DESC"; }; id: any; ids: any; target: string; data: any; }} params
   */
  const convertDataRequestToHTTP = (type, resource, params) => {
    let url = "";
    const options = {};
    const parsedResource = extractRealResourceAndParams(resource);

    switch (type) {
      case GET_LIST: {
        const { page, perPage } = params.pagination;

        let query = RequestQueryBuilder
          // @ts-ignore
          .create({
            filter: composeFilter(params.filter)
          })
          .setLimit(perPage)
          .setPage(page)
          .sortBy(params.sort)
          .setOffset((page - 1) * perPage);

        if (parsedResource.integratedParams) {
          if (parsedResource.integratedParams.join) {
            parsedResource.integratedParams.join.forEach(join => {
              query = query.setJoin(join);
            });
          }

          if (parsedResource.integratedParams.fields) {
            query = query.select(parsedResource.integratedParams.fields);
          }
        }

        url = `${apiUrl}/${parsedResource.realResource}?${query.query()}`;

        break;
      }
      case GET_ONE: {
        let query = RequestQueryBuilder.create();

        if (parsedResource.integratedParams) {
          if (parsedResource.integratedParams.join) {
            parsedResource.integratedParams.join.forEach(join => {
              query = query.setJoin(join);
            });
          }

          if (parsedResource.integratedParams.fields) {
            query = query.select(parsedResource.integratedParams.fields);
          }
        }

        url = `${apiUrl}/${parsedResource.realResource}/${
          params.id
        }?${query.query()}`;

        break;
      }
      case GET_MANY: {
        let query = RequestQueryBuilder.create().setFilter({
          field: "id",
          operator: CondOperator.IN,
          value: `${params.ids}`
        });

        if (parsedResource.integratedParams) {
          if (parsedResource.integratedParams.join) {
            parsedResource.integratedParams.join.forEach(join => {
              query = query.setJoin(join);
            });
          }

          if (parsedResource.integratedParams.fields) {
            query = query.select(parsedResource.integratedParams.fields);
          }
        }

        url = `${apiUrl}/${parsedResource.realResource}?${query.query()}`;

        break;
      }
      case GET_MANY_REFERENCE: {
        const { page, perPage } = params.pagination;
        const filter = composeFilter(params.filter);

        filter.push({
          field: params.target,
          operator: CondOperator.EQUALS,
          value: params.id
        });

        let query = RequestQueryBuilder
          // @ts-ignore
          .create({
            filter
          })
          .sortBy(params.sort)
          .setLimit(perPage)
          .setOffset((page - 1) * perPage);

        if (parsedResource.integratedParams) {
          if (parsedResource.integratedParams.join) {
            parsedResource.integratedParams.join.forEach(join => {
              query = query.setJoin(join);
            });
          }

          if (parsedResource.integratedParams.fields) {
            query = query.select(parsedResource.integratedParams.fields);
          }
        }

        url = `${apiUrl}/${parsedResource.realResource}?${query.query()}`;

        break;
      }
      case UPDATE: {
        url = `${apiUrl}/${parsedResource.realResource}/${params.id}`;
        options.method = "PATCH";
        options.body = JSON.stringify(params.data);
        break;
      }
      case CREATE: {
        url = `${apiUrl}/${parsedResource.realResource}`;
        options.method = "POST";
        options.body = JSON.stringify(params.data);
        break;
      }
      case DELETE: {
        url = `${apiUrl}/${parsedResource.realResource}/${params.id}`;
        options.method = "DELETE";
        break;
      }
      default:
        throw new Error(`Unsupported fetch action type ${type}`);
    }
    return { url, options };
  };

  /**
   * @param {{ headers: any; json: any; }} response
   * @param {any} type
   * @param {string} resource
   * @param {{ data: any; }} params
   */
  function convertHTTPResponse(response, type, resource, params) {
    const { headers, json } = response;
    switch (type) {
      case GET_LIST:
      case GET_MANY_REFERENCE:
        return {
          data: json.data,
          total: json.total
        };
      case CREATE:
        return { data: { ...params.data, id: json.id } };
      default:
        return { data: json };
    }
  }

  return makeNestjsxCrudRequest;

  /**
   * @param {any} type
   * @param {string} resource
   * @param {any} params
   */
  function makeNestjsxCrudRequest(type, resource, params) {
    const parsedResource = extractRealResourceAndParams(resource);
    let intermediate = { type, resource: parsedResource.realResource, params };

    if (configuration && configuration.requestMutator) {
      intermediate = configuration.requestMutator(intermediate);
    }

    if (intermediate.type === UPDATE_MANY) {
      return Promise.all(
        intermediate.params.ids.map(
          /**
           * @param {any} id
           */ id =>
            httpClient(`${apiUrl}/${parsedResource.realResource}/${id}`, {
              method: "PUT",
              body: JSON.stringify(intermediate.params.data)
            })
        )
      ).then(responses => ({
        data: responses.map(response => response.json)
      }));
    }
    if (intermediate.type === DELETE_MANY) {
      return Promise.all(
        intermediate.params.ids.map(
          /**
           * @param {any} id
           */ id =>
            httpClient(`${apiUrl}/${parsedResource.realResource}/${id}`, {
              method: "DELETE"
            })
        )
      ).then(responses => ({
        data: responses.map(response => response.json)
      }));
    }

    const { url, options } = convertDataRequestToHTTP(
      intermediate.type,
      // Original and not intermediate here.
      resource,
      intermediate.params
    );

    return httpClient(url, options).then(
      /**
       * @param {{ headers: any; json: any; }} response
       */ response => {
        // maybe pass here original and not intermediate values?
        let responseIntermediate = {
          response,
          type: intermediate.type,
          resource: intermediate.resource,
          params: intermediate.params
        };

        if (configuration && configuration.responseMutator) {
          responseIntermediate = configuration.responseMutator(
            responseIntermediate
          );
        }

        return convertHTTPResponse(
          response,
          responseIntermediate.type,
          responseIntermediate.resource,
          responseIntermediate.params
        );
      }
    );
  }
}

const MAGIC_SEPARATOR = "_._._._";

/**
 * @param {string} resourceMaybeWithEncoded
 */
function extractRealResourceAndParams(resourceMaybeWithEncoded) {
  if (!resourceMaybeWithEncoded.includes(MAGIC_SEPARATOR)) {
    return {
      realResource: resourceMaybeWithEncoded
    };
  }

  const [realResource, paramsStr] = resourceMaybeWithEncoded.split(
    MAGIC_SEPARATOR
  );

  try {
    /**
     * @type {Pick<import("@nestjsx/crud-request").CreateQueryParams, "join" | "fields">} params
     */
    const integratedParams = JSON.parse(paramsStr);

    return {
      realResource,
      integratedParams
    };
  } catch (e) {
    // @ts-ignore
    console.warn("failed to parse params", { realResource, paramsStr });
    return {
      realResource
    };
  }
}

/**
 * @param {string} resource
 * @param {Pick<import("@nestjsx/crud-request").CreateQueryParams, "join" | "fields">} params
 */
export function encodeParamsInResource(resource, params) {
  return `${resource}${MAGIC_SEPARATOR}${JSON.stringify(params)}`;
}
