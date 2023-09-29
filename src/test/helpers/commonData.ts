export const invalidUuid: string[] = [
  "invalidId", //not uuid
  "80e31d9e-d48f-43a2-b267-b96a490c033", //one character missing
  "80e31d9e-d48f-43a2-b267-b96a490c033aa", //one extra character
  "99b454cc-2288-412a-80411e3ff77e", //missing one portion
  "99b454cc2288412aa2f580411e3ff77e", //no dash
];
