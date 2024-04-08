import { Transaction } from "sequelize";
import Item from "../Item";
import { MAX_IMAGE_COUNT } from "@elycommerce/common";
import ItemImage from "../ItemImage";
import MaxImageExceeded from "../../errors/MaxImageExceeded";
import ImageError from "../../errors/ImageError";

export async function addImages(
  item: Item,
  imageList: string[],
  transaction?: Transaction,
  limit: number = MAX_IMAGE_COUNT
) {
  //check current image count
  const count = await ItemImage.count({
    where: { itemId: item.id },
    transaction,
  });

  //throw if total image count exceed limit
  if (imageList.length + count > limit) throw new MaxImageExceeded();

  //create ItemImage entry
  await ItemImage.bulkCreate(
    imageList.map((image, i) => ({
      order: count + i,
      imageName: image,
      itemId: item.id,
    })),
    { transaction }
  );
}

export async function reorderImages(
  item: Item,
  orders: number[],
  transaction: Transaction
) {
  //check current image count
  const images = await ItemImage.findAll({
    where: { itemId: item.id },
    order: [["order", "ASC"]],
    transaction,
  });

  //enforce uniqueness
  let uniqueOrder = [...new Set(orders).values()];

  //check if any order more than or equal current image count
  //should be [0,count)
  const hasOutOfBound = uniqueOrder.some(
    (order) => order < 0 || order >= images.length
  );

  //throw if received order array length does not match image count
  if (uniqueOrder.length !== images.length || hasOutOfBound)
    throw new ImageError("invalid order array");

  //reorder
  await reorder(images, uniqueOrder, transaction);
}

export async function deleteImages(
  item: Item,
  deleteOrders: number[],
  transaction: Transaction
) {
  //find images from item with matching order and destroy them
  const imageToBeDeleted = await ItemImage.findAll({
    where: { itemId: item.id, order: deleteOrders },
    transaction,
  });

  await ItemImage.destroy({
    where: { itemId: item.id, order: deleteOrders },
    transaction,
  });

  //get the remaining image
  const images = await ItemImage.findAll({
    where: { itemId: item.id },
    order: [["order", "ASC"]],
    transaction,
  });

  //reorder to correct order
  await reorder(images, undefined, transaction);

  //return destroyed image datas
  return imageToBeDeleted.map((image) => image.toJSON());
}

async function reorder(
  images: ItemImage[],
  orders?: number[],
  transaction?: Transaction
) {
  //reorder to invalid value to prevent problem with constraint
  await Promise.all(
    images.map((image) =>
      image.update({ order: -image.order }, { transaction })
    )
  );

  await Promise.all(
    images.map((image, i) =>
      image.update({ order: orders ? orders[i] : i }, { transaction })
    )
  );
}
