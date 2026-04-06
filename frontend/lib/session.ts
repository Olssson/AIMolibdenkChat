const SESSION_KEY = "moly_session_id";
const EMAIL_KEY = "moly_email";

export type Session = {
	sessionId: string;
	email: string;
};

export function getSession(): Session {
	if (typeof window === "undefined") {
		return { sessionId: "", email: "" };
	}

	return {
		sessionId: sessionStorage.getItem(SESSION_KEY) || "",
		email: sessionStorage.getItem(EMAIL_KEY) || "",
	};
}

export function saveSession(sessionId: string, email: string): void {
	if (typeof window === "undefined") {
		return;
	}

	sessionStorage.setItem(SESSION_KEY, sessionId);
	sessionStorage.setItem(EMAIL_KEY, email);
}

export function clearSession(): void {
	if (typeof window === "undefined") {
		return;
	}

	sessionStorage.removeItem(SESSION_KEY);
	sessionStorage.removeItem(EMAIL_KEY);
}
