/**
 * The error result of a failed sign-in or register submission (T-2855).
 *
 * `signInAction` and `signUp` answer through `useActionState`: the result is sent to the browser
 * in the server action response and kept in React state, where devtools, saved HAR files and any
 * script on the page can read it. It may therefore carry back only what the credentials form fills
 * in again (`defaultValue={state?.name}`, `defaultValue={state?.email}`) and the provider it was
 * submitted with. The password, the 2FA `code` and the `captchaToken` never go back: the form
 * keeps the password it needs in its own state.
 *
 * Safe to import from server and client code (no dependencies).
 */
export const AUTH_FORM_ECHOED_FIELDS = ['email', 'name', 'authProvider'] as const;

export type AuthFormEchoedField = (typeof AUTH_FORM_ECHOED_FIELDS)[number];

export type AuthFormErrorState = { error: string } & Partial<Record<AuthFormEchoedField, string>>;

/**
 * Build the error result from the parsed form data. Only the fields in
 * {@link AUTH_FORM_ECHOED_FIELDS} are copied, and only when they are strings, so a field a schema
 * adds later is left out unless it is listed here.
 */
export function authFormErrorState(error: string, data: Readonly<Record<string, unknown>>): AuthFormErrorState {
	const state: AuthFormErrorState = { error };
	for (const field of AUTH_FORM_ECHOED_FIELDS) {
		const value = data[field];
		if (typeof value === 'string') {
			state[field] = value;
		}
	}
	return state;
}
