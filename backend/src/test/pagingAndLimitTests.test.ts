import { Express } from "express";
import request from "supertest";
import { printedExpect } from "./helpers/assertionHelper";
/**
 * Run test suite that tests paging and limit
 * @param app express instance used
 * @param url of the tested endpoint
 * @param creationFunction used to create data in db
 * @param transformerFunction used to transform response.body to array of result
 * @param cookie optional cookie included in request
 */
export default function pagingAndLimitTests(
  app: Express,
  url: string,
  creationFunction: (count: number) => Promise<any>,
  transformerFunction: (body: any) => any[] = (body) => body,
  cookie: string[] = []
) {
  it("default limit default page, should return an empty array when there are no items", async () => {
    await request(app)
      .get(url)
      .send()
      .expect(printedExpect(200))
      .expect(({ body }) => expect(transformerFunction(body)).toHaveLength(0));
  });

  it("valid limit, default page, should return an empty array when there are no items", async () => {
    await request(app)
      .get(url)
      .query({ limit: 40 })
      .set("Cookie", cookie)
      .send()
      .expect(printedExpect(200))
      .expect(({ body }) => {
        expect(transformerFunction(body)).toHaveLength(0);
      });
  });

  it("valid limit valid page, should return an empty array when there are no items", async () => {
    await request(app)
      .get(url)
      .query({ limit: 40, page: 3 })
      .set("Cookie", cookie)
      .send()
      .expect(200)
      .expect(({ body }) => {
        expect(transformerFunction(body)).toHaveLength(0);
      });
  });

  it("default limit default page, should return 80 items when there are 100 items in the shop", async () => {
    // Create 100 items in the shop using your data function
    await creationFunction(100);
    await request(app)
      .get(url)
      .set("Cookie", cookie)
      .send()
      .expect(printedExpect(200))
      .expect(({ body }) => {
        expect(transformerFunction(body)).toHaveLength(80);
      });
  });

  it("page is 2, default limit, should return 20 items when there are 100 items in the shop", async () => {
    // Create 100 items in the shop using your data function
    await creationFunction(100);
    await request(app)
      .get(url)
      .query({ page: 2 })
      .set("Cookie", cookie)
      .send()
      .expect(printedExpect(200))
      .expect(({ body }) => {
        expect(transformerFunction(body)).toHaveLength(20);
      });
  });

  it("page 3 default limit, should return 0 items when there are 100 items in the shop", async () => {
    // Create 100 items in the shop using your data function
    await creationFunction(100);
    await request(app)
      .get(url)
      .query({ page: 3 })
      .set("Cookie", cookie)
      .send()
      .expect(printedExpect(200))
      .expect(({ body }) => {
        expect(transformerFunction(body)).toHaveLength(0);
      });
  });

  it("limit 40, default page, should return 40 items when there are 100 items in the shop", async () => {
    // Create 100 items in the shop using your data function
    await creationFunction(100);
    await request(app)
      .get(url)
      .query({ limit: 40 })
      .set("Cookie", cookie)
      .send()
      .expect(printedExpect(200))
      .expect(({ body }) => {
        expect(transformerFunction(body)).toHaveLength(40);
      });
  });

  it("limit is 30, and page is 4, should return 10 items when there are 100 items in the shop", async () => {
    // Create 100 items in the shop using your data function
    await creationFunction(100);
    await request(app)
      .get(url)
      .query({ limit: 30, page: 4 })
      .set("Cookie", cookie)
      .send()
      .expect(printedExpect(200))
      .expect(({ body }) => {
        expect(transformerFunction(body)).toHaveLength(10);
      });
  });

  it("invalid limit values, should return status code 400", async () => {
    const invalidLimits = [-1, 0, 501, "blabla"];
    for (const limit of invalidLimits) {
      await request(app)
        .get(url)
        .query({ limit })
        .set("Cookie", cookie)
        .send()
        .expect(printedExpect(400));
    }
  });

  it("invalid page values, should return status code 400", async () => {
    const invalidPages = [-1, 0, 5001, "yeayea"];
    for (const page of invalidPages) {
      await request(app)
        .get(url)
        .query({ page })
        .set("Cookie", cookie)
        .send()
        .expect(printedExpect(400));
    }
  });
}
