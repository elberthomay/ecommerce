import { Request, Response, NextFunction, Router } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import authenticate from "../middlewares/authenticate";
import fetch, { fetchCurrentUser } from "../middlewares/fetch";
import catchAsync from "../middlewares/catchAsync";
import User from "../models/User";
import ShopAddress from "../models/ShopAddress";
import Shop from "../models/Shop";
import Address, { AddressCreationAttribute } from "../models/Address";
import validator from "../middlewares/validator";
import AddressLimitError from "../errors/AddressLimitError";
import { authorization } from "../middlewares/authorize";
import UserAddress from "../models/UserAddress";
import {
  addressCreateSchema,
  addressOutputSchema,
  addressParamSchema,
  addressUpdateSchema,
} from "@elycommerce/common";
import NotFoundError from "../errors/NotFoundError";
import { ModelWithAddresses } from "../test/helpers/address/addressHelper";
import sequelize from "../models/sequelize";
import { isNull, omitBy } from "lodash";
import { z } from "zod";

const router = Router();

//authorize if root, admin or owner of address
const authorizeStaffOrAddressOwner = authorization(
  [
    0,
    1,
    (req: Request<z.infer<typeof addressParamSchema> | ParamsDictionary>) => {
      const addressList: Address[] | null | undefined = (req as any)
        .addressList;
      const addressId = req.params.addressId;
      if (addressList && addressId)
        return addressList.some(({ id }) => id === addressId);
      else return false;
    },
  ],
  "Address"
);

//get userAddress and shopAddress and put them on req.addressList
const getAllAddresses = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const currentUser: User = (req as any).currentUser;
    await currentUser.reload({ include: Shop });
    const currentShop = currentUser.shop;
    const userAddresses = await currentUser.$get("addresses");
    const shopAddresses = currentShop
      ? await currentShop.$get("addresses")
      : [];
    (req as any).addressList = userAddresses.concat(shopAddresses);
    next();
  }
);

async function createAddress<T extends ModelWithAddresses>(
  parentInstance: T,
  addressData: z.infer<typeof addressCreateSchema>,
  addressLimit: number
): Promise<Address> {
  const addresses = (await parentInstance.$get("addresses")) as Address[];
  if (addresses.length >= addressLimit)
    throw new AddressLimitError(
      `User cannot have more than ${addressLimit} addresses`
    );
  const newAddress: Address = await parentInstance.$create(
    "address",
    addressData
  );
  await newAddress.reload({ include: [UserAddress, ShopAddress] });
  return newAddress;
}

function formatAddress(
  address: Address,
  selectedAddressId?: string | null
): z.infer<typeof addressOutputSchema> {
  const {
    id,
    name,
    phoneNumber,
    latitude,
    longitude,
    postCode,
    detail,
    village,
    district,
    city,
    province,
    country,
    recipient,
    shopAddress,
    subdistrictId,
  } = address;
  if (selectedAddressId === undefined && !shopAddress)
    throw new Error("addressFormat, ShopAddress data not provided");
  const addressOutput = {
    id,
    name,
    phoneNumber,
    latitude,
    longitude,
    village,
    district,
    city,
    province,
    country,
    recipient,
    postCode,
    detail,
    subdistrictId,
    selected:
      selectedAddressId !== undefined
        ? id === selectedAddressId
        : shopAddress?.selected ?? false,
  };
  return omitBy(addressOutput, isNull) as unknown as z.infer<
    typeof addressOutputSchema
  >;
}

// get user addresses
router.get(
  "/user",
  authenticate(true),
  fetchCurrentUser,
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const currentUser: User = (req as any).currentUser;
    // put selectedId on top, followed by the rest by last updated timestamp
    const addresses = await currentUser.$get("addresses", {
      order: [
        [
          sequelize.literal(
            `(id = ${
              currentUser.selectedAddressId
                ? `'${currentUser.selectedAddressId}'`
                : null
            })`
          ),
          "DESC",
        ],
        ["updatedAt", "DESC"],
      ],
    });

    const result = addresses.map((address) =>
      formatAddress(address, currentUser.selectedAddressId)
    );

    res.status(200).json(result);
  })
);

// get shop addresses
router.get(
  "/shop",
  authenticate(true),
  fetchCurrentUser,
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const currentUser: User = (req as any).currentUser;
    await currentUser.reload({ include: Shop });
    if (!currentUser.shop) return res.status(200).json([]);
    else {
      const addresses = await Address.findAll({
        include: { model: ShopAddress, where: { shopId: currentUser.shop.id } },
        order: [
          // put selected addresses on top, followed by the rest by last updated timestamp
          ["shopAddress", "selected", "DESC"],
          ["updatedAt", "DESC"],
        ],
      });

      const result = addresses.map((address) => formatAddress(address));
      return res.status(200).json(result);
    }
  })
);

// add user address
router.post(
  "/user",
  authenticate(true),
  validator({ body: addressCreateSchema }),
  fetchCurrentUser,
  catchAsync(
    async (
      req: Request<
        unknown,
        unknown,
        z.infer<typeof addressCreateSchema>,
        unknown
      >,
      res: Response,
      next: NextFunction
    ) => {
      const currentUser: User = (req as any).currentUser;
      const addressData: z.infer<typeof addressCreateSchema> = req.body;

      const newAddress = await createAddress(currentUser, addressData, 10);
      if (!currentUser.selectedAddressId)
        await currentUser.update({ selectedAddressId: newAddress.id });

      const result = formatAddress(newAddress, currentUser.selectedAddressId);

      res.status(201).json(result);
    }
  )
);

// add shop address
router.post(
  "/shop",
  authenticate(true),
  validator({ body: addressCreateSchema }),
  fetchCurrentUser,
  catchAsync(
    async (
      req: Request<
        unknown,
        unknown,
        z.infer<typeof addressCreateSchema>,
        unknown
      >,
      res: Response,
      next: NextFunction
    ) => {
      const currentUser: User = (req as any).currentUser;
      await currentUser.reload({ include: Shop });
      if (!currentUser.shop) throw new NotFoundError("Shop");
      const addressData = req.body;
      const newAddress = await createAddress(currentUser.shop, addressData, 20);
      await newAddress.reload({ include: ShopAddress });
      const result = formatAddress(newAddress);

      res.status(201).json(result);
    }
  )
);

// update address
router.patch(
  "/:addressId",
  authenticate(true),
  validator({ body: addressUpdateSchema, params: addressParamSchema }),
  fetchCurrentUser,
  fetch<AddressCreationAttribute, z.infer<typeof addressParamSchema>>({
    model: Address,
    location: "params",
    key: ["id", "addressId"],
    force: "exist",
    include: [{ model: ShopAddress }, { model: UserAddress, include: [User] }],
  }),
  getAllAddresses,
  authorizeStaffOrAddressOwner,
  catchAsync(
    async (
      req: Request<
        z.infer<typeof addressParamSchema> | ParamsDictionary,
        unknown,
        z.infer<typeof addressUpdateSchema>
      >,
      res: Response,
      next: NextFunction
    ) => {
      const address: Address = (req as any)[Address.name];
      const ownerSelectedAddressId: string | null | undefined =
        address.userAddress?.user.selectedAddressId;

      const addressUpdate = req.body;
      await address.update(addressUpdate);

      const result = address.userAddress
        ? formatAddress(address, ownerSelectedAddressId) // a user address
        : formatAddress(address); //a shop address
      res.status(200).json(result);
    }
  )
);

// delete address
router.delete(
  "/:addressId",
  authenticate(true),
  validator({ params: addressParamSchema }),
  fetchCurrentUser,
  fetch<AddressCreationAttribute, z.infer<typeof addressParamSchema>>({
    model: Address,
    location: "params",
    key: ["id", "addressId"],
    force: "exist",
  }),
  getAllAddresses,
  authorizeStaffOrAddressOwner,
  catchAsync(
    async (
      req: Request<
        z.infer<typeof addressParamSchema> | ParamsDictionary,
        unknown,
        z.infer<typeof addressUpdateSchema>,
        unknown
      >,
      res: Response,
      next: NextFunction
    ) => {
      const currentUser: User = (req as any).currentUser;
      const address: Address = (req as any)[Address.name];
      await address.destroy();
      //set selected address to last updated address if available
      if (currentUser.selectedAddressId === address.id) {
        const addresses = await currentUser.$get("addresses", {
          order: [["updatedAt", "DESC"]],
        });
        if (addresses.length !== 0)
          await currentUser.update({ selectedAddressId: addresses[0].id });
      }
      res.status(200).json({ status: "success" });
    }
  )
);

// select a certain user address
router.post(
  "/select/:addressId",
  authenticate(true),
  validator({ params: addressParamSchema }),
  fetchCurrentUser,
  fetch<AddressCreationAttribute, z.infer<typeof addressParamSchema>>({
    model: Address,
    key: ["id", "addressId"],
    location: "params",
    include: [{ model: UserAddress }],
    force: "exist",
  }),
  catchAsync(
    async (
      req: Request<z.infer<typeof addressParamSchema> | ParamsDictionary>,
      res: Response,
      next: NextFunction
    ) => {
      const currentUser: User = (req as any).currentUser;
      const address: Address = (req as any)[Address.name];
      const userAddress = address.userAddress;
      if (userAddress && userAddress.userId === currentUser.id) {
        await currentUser.update({ selectedAddressId: address.id });
        res.status(200).json({ status: "success" });
      } else throw new NotFoundError("UserAddress");
    }
  )
);

// toggle a certain shop address
router.post(
  "/toggle/:addressId",
  authenticate(true),
  validator({ params: addressParamSchema }),
  fetchCurrentUser,
  fetch<AddressCreationAttribute, z.infer<typeof addressParamSchema>>({
    model: Address,
    key: ["id", "addressId"],
    location: "params",
    include: [{ model: ShopAddress }],
    force: "exist",
  }),
  catchAsync(
    async (
      req: Request<z.infer<typeof addressParamSchema> | ParamsDictionary>,
      res: Response,
      next: NextFunction
    ) => {
      const currentUser: User = (req as any).currentUser;
      await currentUser.reload({ include: Shop });
      const currentShop = currentUser.shop;

      const address: Address = (req as any)[Address.name];
      const shopAddress = address.shopAddress;

      if (!currentShop) throw new NotFoundError("Shop"); // user has no shop

      if (shopAddress && shopAddress.shopId === currentShop.id) {
        await shopAddress.update({ selected: !shopAddress.selected });
        res.status(200).json({ status: "success" });
      } else throw new NotFoundError("ShopAddress"); // shop isn't a shop id or address is not user's shop address
    }
  )
);

export default router;
