import User from "../../../models/User";
import {
  defaultUser,
  invalidEmails,
  invalidName,
  invalidPasswords,
} from "./userData";
import { defaultRegisterData } from "./userData";
import { Express } from "express";
import request from "supertest";
import { omit } from "lodash";

const newUserNotCreated = async (): Promise<boolean> => {
  const user = await User.findOne({ where: { email: defaultUser.email } });
  return user ? false : true;
};

export function passwordTest(app: Express, url: string) {
  it("should return 400 if password length is invalid", async () => {
    const invalidBodies = invalidPasswords.map((password) => ({
      ...defaultRegisterData,
      password,
    }));

    await Promise.all(
      invalidBodies.map((body) => request(app).post(url).send(body).expect(400))
    );
    expect(await newUserNotCreated()).toBe(true);
  });
}

export function emailTest(app: Express, url: string) {
  it("should return 400 if email is invalid", async () => {
    const invalidBodies = invalidEmails.map((email) => ({
      ...defaultRegisterData,
      email,
    }));

    await Promise.all(
      invalidBodies.map((body) => request(app).post(url).send(body).expect(400))
    );

    expect(await newUserNotCreated()).toBe(true);
  });
}

export function nameTest(app: Express, url: string) {
  it("should return 400 if name is invalid", async () => {
    const invalidRegisterDatas = invalidName.map((name) => ({
      ...defaultRegisterData,
      name,
    }));

    await Promise.all(
      invalidRegisterDatas.map((registerData) =>
        request(app).post(url).send(registerData).expect(400)
      )
    );
  });
}

export function registerPropertyTest(app: Express, url: string) {
  it("should return 400 if any required property is missing", async () => {
    const invalidBodies = [
      omit(defaultRegisterData, "email"), //missing email
      omit(defaultRegisterData, "name"), //missing name
      omit(defaultRegisterData, "password"), //missing password
    ];

    await Promise.all(
      invalidBodies.map((body) => request(app).post(url).send(body).expect(400))
    );

    expect(await newUserNotCreated()).toBe(true);
  });

  it("should return 400 if any property is empty", async () => {
    const invalidBodies = [
      { ...defaultRegisterData, email: "" }, //empty email
      { ...defaultRegisterData, name: "" }, //empty name
      { ...defaultRegisterData, password: "" }, //empty password
    ];

    await Promise.all(
      invalidBodies.map((body) => request(app).post(url).send(body).expect(400))
    );

    expect(await newUserNotCreated()).toBe(true);
  });
}
