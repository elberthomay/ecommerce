export default class ValidationError extends Error {
  constructor(public errors: Object) {
    super("Error occured during validation");
  }
}
