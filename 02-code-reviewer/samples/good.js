export async function fetchUser(userId) {
    if (!userId || typeof userId !== "string") {
        throw new TypeError("userId must be a non-empty string");
    }

    const response = await fetch(`/api/users/${encodeURIComponent(userId)}`);
    if (!response.ok) {
        throw new Error(`Failed to fetch user: ${response.status}`);
    }

    return response.json();
}