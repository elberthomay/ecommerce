import { faker } from "@faker-js/faker";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User, { UserCreationAttribute } from "../../../models/User";
import { TokenTypes } from "../../../types/TokenTypes";
import _ from "lodash";
import sequelize from "../../../models/sequelize";
import { Response } from "supertest";
import { defaultUser } from "./userData";

/**
 * Create users from count or array of fragmented(or whole) user data.
 * incomplete user data will be completed with random data.
 * @param creationData number | array of fragmented user data
 *   number: create a number of completely fabricated user data
 *   array: create array length number of user
 * @returns {users: User[], userDatas: UserCreationAttribute[]} Promise
 */
export const createUser = async (
  creationData: number | Partial<UserCreationAttribute>[]
) => {
  let userDatas: (UserCreationAttribute & { password: string })[];

  //function to create completed userData
  const userDataCreateFunction =
    (creationData?: Partial<UserCreationAttribute & { password: string }>) =>
    (): UserCreationAttribute & { password: string } => {
      const password = creationData?.password ?? faker.internet.password();
      return {
        id: creationData?.id ?? faker.string.uuid(),
        name: creationData?.name ?? faker.person.fullName(),
        email: creationData?.email ?? faker.internet.email(),
        hash: bcrypt.hashSync(password, 10),
        password,
        privilege: creationData?.privilege ?? 2,
      };
    };

  if (typeof creationData === "number")
    userDatas = faker.helpers.multiple(userDataCreateFunction(), {
      count: creationData,
    });
  else userDatas = creationData.map((data) => userDataCreateFunction(data)());

  const transaction = await sequelize.transaction();
  const records = await Promise.all(
    userDatas.map((userData) =>
      User.findOrCreate({
        where: { id: userData.id },
        transaction,
        defaults: { ..._.omit(userData, "password") },
      })
    )
  );
  await transaction.commit();
  return { users: records.map((record) => record[0]), userDatas: userDatas };
};

/**
 * Create cookie string using the provided token data
 * @param sessionData used to create cookie
 * @param options optional custom jwt signing option
 * @param jwtSecret optional jwt secret key, defaults to environmental variable JWT_SECRET
 * @param cookieName optional cookie name
 * @returns cookie string with format of cookieName=Token
 */
export const forgeCookie = (
  sessionData: { id: string },
  options?: jwt.SignOptions,
  jwtSecret?: string,
  cookieName?: string
) => {
  jwtSecret = jwtSecret ?? process.env.JWT_SECRET!;
  const token = jwt.sign({ id: sessionData.id }, jwtSecret, options);
  // const cookie = Buffer.from(token).toString("base64");
  return `${cookieName ?? "jwt"}=${token}`;
};

/**
 * parse set-cookie header from supertest response object
 * @param response object from supertest
 * @returns array of array containing name value pair if set-cookie is defined,
 *   null otherwise
 */
export const parseResponseCookie = (response: Response) => {
  if (response.headers["set-cookie"]) {
    return (response.headers["set-cookie"] as string[]).map(
      (cookieString: string) =>
        cookieString.split(";").map((cookie) => {
          const cookiePair = cookie.trim().split("=");
          return { name: cookiePair[0], value: cookiePair[1] };
        })
    );
  } else return null;
};

export const tokenEqualityTest = (token: string) => (res: Response) => {
  const cookies = parseResponseCookie(res)!;
  expect(cookies).toBeDefined();
  expect(
    cookies.some((cookieArray) =>
      cookieArray.some((cookie) => {
        if (cookie.name === "jwt") {
          expect(cookie.value).toEqual(token);
          return true;
        } else return false;
      })
    )
  ).toBe(true);
};

export const createDefaultUser = async () => {
  const { users } = await createUser([defaultUser]);
  return users[0];
};

export const defaultCookie = (options?: jwt.SignOptions) => [
  forgeCookie(defaultUser, options),
];
