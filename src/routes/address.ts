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
import {
  AddressCreateType,
  AddressParamType,
  AddressUpdateType,
} from "../types/addressType";
import UserAddress from "../models/UserAddress";
import {
  addressCreateSchema,
  addressParamSchema,
  addressUpdateSchema,
} from "../schemas.ts/addressSchema";
import NotFoundError from "../errors/NotFoundError";
import { ModelWithAddresses } from "../test/helpers/address/addressHelper";
import sequelize from "../models/sequelize";

const router = Router();

//authorize if root, admin or owner of address
const authorizeStaffOrAddressOwner = authorization(
  [
    0,
    1,
    (req: Request<AddressParamType | ParamsDictionary>) => {
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
  addressData: AddressCreateType,
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
  return newAddress;
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

    const result = addresses.map((address) => {
      const { id, latitude, longitude, postCode, detail, subdistrictId } =
        address;
      return {
        id,
        latitude,
        longitude,
        postCode,
        detail,
        subdistrictId,
        selected: id === currentUser.selectedAddressId,
      };
    });

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
    // put selected address on top, followed by the rest by last updated timestamp
    const shopAddress = await ShopAddress.findAll({
      include: [
        { model: Shop, where: { userId: currentUser.id } },
        { model: Address },
      ],
      order: [
        ["selected", "DESC"],
        ["address", "updatedAt", "DESC"],
      ],
    });

    const result = shopAddress.map((shopAddress) => {
      const { id, latitude, longitude, postCode, detail, subdistrictId } =
        shopAddress.address;
      return {
        id,
        latitude,
        longitude,
        postCode,
        detail,
        subdistrictId,
        selected: shopAddress.selected,
      };
    });
    res.status(200).json(result);
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
      req: Request<unknown, unknown, AddressCreateType, unknown>,
      res: Response,
      next: NextFunction
    ) => {
      const currentUser: User = (req as any).currentUser;
      const addressData: AddressCreateType = req.body;

      const newAddress = await createAddress(currentUser, addressData, 10);
      //   const addresses = await currentUser.$get("addresses");
      //   if (addresses.length >= 10)
      //     throw new AddressLimitError("User cannot have more than 10 addresses");
      //   const newAddressId = uuid();
      //   const newAddress = await currentUser.$create<Address>("addresses", {
      //     ...addressData,
      //     id: newAddressId,
      //   });
      if (!currentUser.selectedAddressId)
        await currentUser.update({ selectedAddressId: newAddress.id });
      res.status(201).json(newAddress);
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
      req: Request<unknown, unknown, AddressCreateType, unknown>,
      res: Response,
      next: NextFunction
    ) => {
      const currentUser: User = (req as any).currentUser;
      await currentUser.reload({ include: Shop });
      if (!currentUser.shop) throw new NotFoundError("Shop");
      const addressData = req.body;
      const newAddress = await createAddress(currentUser.shop, addressData, 20);
      res.status(201).json(newAddress);
    }
  )
);

// update address
router.patch(
  "/:addressId",
  authenticate(true),
  validator({ body: addressUpdateSchema, params: addressParamSchema }),
  fetchCurrentUser,
  fetch<AddressCreationAttribute, AddressParamType>({
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
        AddressParamType | ParamsDictionary,
        unknown,
        AddressUpdateType
      >,
      res: Response,
      next: NextFunction
    ) => {
      const address: Address = (req as any)[Address.name];
      const addressUpdate = req.body;
      await address.update(addressUpdate);
      res.status(200).json(address);
    }
  )
);

// delete address
router.delete(
  "/:addressId",
  authenticate(true),
  validator({ params: addressParamSchema }),
  fetchCurrentUser,
  fetch<AddressCreationAttribute, AddressParamType>({
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
        AddressParamType | ParamsDictionary,
        unknown,
        AddressUpdateType,
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
  fetch<AddressCreationAttribute, AddressParamType>({
    model: Address,
    key: ["id", "addressId"],
    location: "params",
    include: [{ model: UserAddress }],
    force: "exist",
  }),
  catchAsync(
    async (
      req: Request<AddressParamType | ParamsDictionary>,
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
  fetch<AddressCreationAttribute, AddressParamType>({
    model: Address,
    key: ["id", "addressId"],
    location: "params",
    include: [{ model: ShopAddress }],
    force: "exist",
  }),
  catchAsync(
    async (
      req: Request<AddressParamType | ParamsDictionary>,
      res: Response,
      next: NextFunction
    ) => {
      const currentUser: User = (req as any).currentUser;
      await currentUser.reload({ include: Shop });
      const currentShop = currentUser.shop;

      const address: Address = (req as any)[Address.name];
      const shopAddress = address.shopAddress;

      if (!currentShop) throw new NotFoundError("Shop");

      if (shopAddress && shopAddress.shopId === currentShop.id) {
        await shopAddress.update({ selected: !shopAddress.selected });
        res.status(200).json({ status: "success" });
      } else throw new NotFoundError("ShopAddress");
    }
  )
);

export default router;
