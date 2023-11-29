import { Express } from "express";
import path from "path";
import request from "supertest";

const getImagePath = (fileName: string) =>
  path.resolve(__dirname, "testImage", fileName);

export default function imageInputTests(
  app: Express,
  url: string,
  method: "post" | "patch",
  cookie: string[],
  maxImageCount: number,
  fieldName: string,
  body: any
) {
  it("return 400 when number of item exceed maximum count", async () => {
    const imageArray = Array(maxImageCount + 1).fill(
      getImagePath("350kb.webp")
    );
    let requestObject = request(app)
      [method](url)
      .set("Cookie", cookie)
      .type("multipart/form-data")
      .field("body", body ? JSON.stringify(body) : "");
    for (const image of imageArray) {
      requestObject = requestObject.attach(fieldName, image);
    }

    await requestObject.expect(400);

    // await request(app)
    //   [method](url)
    //   .set("Cookie", cookie)
    //   .field(body, JSON.stringify(body))
    //   .attach("image", getImagePath("350kb.webp"))
    //   .expect(400);
  });
  it("return 400 when size exceed MAX_SIZE", async () => {
    const imageArray = [
      ...Array(maxImageCount - 1).fill(getImagePath("350kb.webp")),
      getImagePath("2mb.webp"),
    ];
    let requestObject = request(app)
      [method](url)
      .set("Cookie", cookie)
      .type("multipart/form-data")
      .field("body", body ? JSON.stringify(body) : "");

    for (const image of imageArray) {
      requestObject = requestObject.attach(fieldName, image);
    }
    await requestObject.expect(400);
  });
  it("return 400 when files are not of WEBP format", async () => {
    const imageArray = [
      ...Array(maxImageCount - 1).fill(getImagePath("350kb.webp")),
      getImagePath("nonwebp.jpg"),
    ];

    let requestObject = request(app)
      [method](url)
      .set("Cookie", cookie)
      .type("multipart/form-data")
      .field("body", body ? JSON.stringify(body) : "");

    for (const image of imageArray) {
      requestObject = requestObject.attach(fieldName, image);
    }
    await requestObject.expect(400);
  });
}
