export interface ApiErrorItem {
  code: string
  message: string
}

export interface ApiErrorResponse {
  data: null
  errors: ApiErrorItem[]
  meta: {
    success: false
    message: string
  }
}