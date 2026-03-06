import type { AriaAttributes } from "react"

export function getFormControlValidationProps(
  invalid: boolean | undefined,
): Pick<AriaAttributes, "aria-invalid"> {
  return invalid ? { "aria-invalid": true } : {}
}
