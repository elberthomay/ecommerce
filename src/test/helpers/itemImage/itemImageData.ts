import { MAX_IMAGE_COUNT } from "../../../var/constants";

export const invalidOrderArray = [
  [],
  [-1, 2],
  [MAX_IMAGE_COUNT + 1, 2],
  ["boo", 3],
  [1.3, 3, 4],
];
