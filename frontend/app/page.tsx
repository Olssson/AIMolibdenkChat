"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import LoginForm from "../components/LoginForm";
import { getSession } from "../lib/session";

export default function LoginPage() {
	const router = useRouter();

	useEffect(() => {
		const { sessionId } = getSession();
		if (sessionId) {
			router.replace("/chat");
		}
	}, [router]);

	return <LoginForm />;
}
