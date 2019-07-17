import createDataProvider, { encodeParamsInResource } from "./index";

describe("Basic tests", () => {
  test("Basic test 1", async () => {
    // @ts-ignore
    const httpClient = jest.fn(async (type, resource, params) => {
      return {
        json: {
          id: 1
        },
        ...params
      };
    });

    const dataProvider = createDataProvider(
      "https://test.test/api",
      httpClient
    );

    expect(
      await dataProvider("GET_ONE", "books", { id: "5" })
    ).toMatchSnapshot();
    expect(await asyncResultsToValue(httpClient)).toMatchSnapshot();
  });
});

describe("encodeParamsInResource tests", () => {
  test("encodeParamsInResource test 1", async () => {
    expect(
      encodeParamsInResource("books", {
        fields: ["id", "name", "year"],
        join: [
          {
            field: "pages",
            select: ["number", "words"]
          },
          {
            field: "author",
            select: ["id", "name"]
          },
          {
            field: "author.favoriteFood",
            select: ["id", "name"]
          }
        ]
      })
    ).toMatchSnapshot();
  });
});

describe("encoded params tests", () => {
  test("encoded params test 1", async () => {
    // @ts-ignore
    const httpClient = jest.fn(async (type, resource, params) => {
      return {
        json: {
          id: 1
        },
        ...params
      };
    });

    const dataProvider = createDataProvider(
      "https://test.test/api",
      httpClient
    );

    const resourceWithParams = encodeParamsInResource("books", {
      fields: ["id", "name", "year"],
      join: [
        {
          field: "pages",
          select: ["number", "words"]
        },
        {
          field: "author",
          select: ["id", "name"]
        },
        {
          field: "author.favoriteFood",
          select: ["id", "name"]
        }
      ]
    });

    expect(
      await dataProvider("GET_ONE", resourceWithParams, { id: "5" })
    ).toMatchSnapshot();
    expect(await asyncResultsToValue(httpClient)).toMatchSnapshot();
  });
});

// @ts-ignore
async function asyncResultsToValue(jestFned) {
  // @ts-ignore
  jestFned.mock.results = await Promise.all(
    (jestFned.mock.results || []).map(
      /**
       * @param {{ value: any; type: any; }} result
       */ async result => {
        if (result.value instanceof Promise) {
          return {
            type: result.type,
            wasPromise: true,
            value: await result.value
          };
        }

        return result;
      }
    )
  );

  return jestFned;
}
