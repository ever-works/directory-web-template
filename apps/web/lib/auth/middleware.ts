import { z } from "zod";
import { auth } from ".";
import { User } from "next-auth";

export type ActionState = {
  error?: string;
  success?: string;
  redirect?: string;
  [key: string]: any; // This allows for additional properties
};

type ValidatedActionFunction<S extends z.ZodType<any, any>, T> = (
  data: z.infer<S>,
  formData: FormData
) => Promise<T>;

/**
 * Wrap a Zod-validated Server Action for use with `useActionState`.
 *
 * **Three behaviours worth knowing:**
 *
 *   1. **First validation error only.** On `safeParse` failure we
 *      surface `issues[0].message` and discard the rest. Multi-field
 *      forms that want to highlight every invalid field need to
 *      either reshape the return as `{ errors: ZodIssue[] }` or do
 *      client-side validation alongside this.
 *
 *   2. **`Object.fromEntries(formData)`** keeps only the LAST value
 *      per key. Multi-select checkboxes, multi-file inputs, and any
 *      `<input name="x">` repeated more than once collapse to a
 *      single value here. Use `formData.getAll(key)` explicitly in
 *      the action if multi-value semantics matter.
 *
 *   3. **`{ error } as T`** is a deliberate lie to TypeScript — `T`
 *      is intended to extend {@link ActionState} (which has an
 *      optional `error` field) but nothing in the signature
 *      enforces it. If a future caller picks a `T` without
 *      `error: string`, runtime returns a malformed object. Worth
 *      tightening to `T extends ActionState` if the call sites are
 *      consistent.
 */
export function validatedAction<S extends z.ZodType<any, any>, T>(
  schema: S,
  action: ValidatedActionFunction<S, T>
) {
  return async (prevState: ActionState, formData: FormData): Promise<T> => {
    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return { error: result.error.issues[0].message } as T;
    }

    return action(result.data, formData);
  };
}

type ValidatedActionWithUserFunction<S extends z.ZodType<any, any>, T> = (
  data: z.infer<S>,
  formData: FormData,
  user: User
) => Promise<T>;

/**
 * Same as {@link validatedAction} but injects the signed-in user.
 *
 * **Auth-failure shape is INCONSISTENT with the sibling helper.**
 * `validatedAction` returns `{ error }` on validation failure;
 * this helper **throws** on missing session instead. That bubbles
 * to Next.js error boundary / 500 page rather than rendering a
 * form-level error message — fine for "this should never happen
 * because the page is auth-gated upstream", a surprise for any
 * caller that expected to receive `state.error` and re-render.
 * Callers that want graceful UX should redirect to `/auth/signin`
 * BEFORE invoking this action, not rely on its error state.
 *
 * Validation-error and `Object.fromEntries` caveats from
 * {@link validatedAction} also apply here.
 */
export function validatedActionWithUser<S extends z.ZodType<any, any>, T>(
  schema: S,
  action: ValidatedActionWithUserFunction<S, T>
) {
  return async (prevState: ActionState, formData: FormData): Promise<T> => {
    const session = await auth();
    if (!session?.user) {
      throw new Error("User is not authenticated");
    }

    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return { error: result.error.issues[0].message } as T;
    }

    return action(result.data, formData, session?.user);
  };
}
