export interface ApiSuccessResponse<T = unknown> {
  code: number;
  message: string;
  data: T | T[] | null;
}

export interface ApiErrorResponse<T = unknown> {
  code: number;
  message: string;
  errors: T[] | null;
}
