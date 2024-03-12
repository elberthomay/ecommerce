export default function queryOptionToLimitOffset(options: {
  limit?: number;
  page?: number;
}) {
  const limit = options.limit ?? 80;
  const offset = options.page ? (options.page - 1) * limit : 0;
  return { limit, offset };
}
